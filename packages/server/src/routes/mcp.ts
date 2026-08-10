import { Hono } from "hono";
import type { Context } from "hono";
import { SearchRequestSchema } from "@dak/contract";
import type { HonoEnv } from "../types";
import { search } from "../search/engine";
import { hashApiKey, verifyApiKey } from "../auth/api-key";
import { createAuth } from "../auth/better-auth";

export const mcpRoutes = new Hono<HonoEnv>();

const API_SEARCH_TOOL = {
  name: "api_search",
  description: "Search the Grand Archive news index with optional category/source/date filters.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      q: { type: "string", minLength: 1, description: "Search query" },
      category: { type: "string" },
      source: { type: "string" },
      from: { type: "string", description: "ISO date/time lower bound" },
      to: { type: "string", description: "ISO date/time upper bound" },
      limit: { type: "number", minimum: 1, maximum: 100, default: 20 },
      offset: { type: "number", minimum: 0, default: 0 },
    },
    required: ["q"],
  },
} as const;

mcpRoutes.get("/mcp", (c) => {
  return c.json({
    name: "The Grand Archive MCP",
    version: "1.0.0",
    transport: "jsonrpc-over-http",
    endpoints: {
      mcp: "/mcp",
      oauthProtectedResource: "/.well-known/oauth-protected-resource",
      oauthAuthorizationServer: "/.well-known/oauth-authorization-server",
    },
  });
});

mcpRoutes.post("/mcp", async (c) => {
  const body = await c.req.json().catch(() => null) as JsonRpcRequest | JsonRpcRequest[] | null;
  if (!body || Array.isArray(body) || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return c.json(jsonRpcError(null, -32600, "Invalid Request"));
  }
  const notification = body.id === undefined;

  if (body.method === "initialize") {
    if (notification) return c.body(null, 202);
    return c.json(
      jsonRpcResult(body.id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          oauth: { supported: true, token_endpoint: "/oauth/token" },
        },
        serverInfo: { name: "The Grand Archive MCP", version: "1.0.0" },
      })
    );
  }

  if (body.method === "notifications/initialized") {
    return c.body(null, 202);
  }

  if (body.method === "ping") {
    if (notification) return c.body(null, 202);
    return c.json(jsonRpcResult(body.id, {}));
  }

  if (body.method === "tools/list") {
    if (notification) return c.body(null, 202);
    return c.json(jsonRpcResult(body.id, { tools: [API_SEARCH_TOOL] }));
  }

  if (body.method === "tools/call") {
    const params = body.params ?? {};
    const toolName = typeof params.name === "string" ? params.name : "";
    if (toolName !== "api_search") {
      return c.json(jsonRpcError(body.id, -32601, `Tool not found: ${toolName || "(empty)"}`));
    }

    const parsed = SearchRequestSchema.safeParse(params.arguments ?? {});
    if (!parsed.success) {
      return c.json(jsonRpcError(body.id, -32602, parsed.error.issues.map((i) => i.message).join("; ")));
    }

    const maxAge = c.get("maxAge") as string | null;
    const tier = (c.get("tier") as "anonymous" | "free" | "premium") ?? "anonymous";
    const { q, category, source, from, to, limit, offset } = parsed.data;
    const result = await search(c.env.DB, q, {
      category,
      source,
      from,
      to,
      maxAge: maxAge ?? undefined,
      limit,
      offset,
    });

    const payload = {
      results: result.results,
      total: result.total,
      query: q,
      tier,
      tierCutoff: result.tierFiltered ? maxAge : null,
    };

    return c.json(
      jsonRpcResult(body.id, {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload,
      })
    );
  }

  if (notification) return c.body(null, 202);
  return c.json(jsonRpcError(body.id, -32601, `Method not found: ${body.method}`));
});

// OAuth 2.0 protected-resource metadata (RFC 9728)
mcpRoutes.get("/.well-known/oauth-protected-resource", (c) => {
  const base = requestBaseUrl(c.req.url, c.req.header("host"));
  return c.json({
    resource: `${base}/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    scopes_supported: ["api_search"],
  });
});

// OAuth 2.0 authorization-server metadata (RFC 8414)
mcpRoutes.get("/.well-known/oauth-authorization-server", (c) => {
  const base = requestBaseUrl(c.req.url, c.req.header("host"));
  return c.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "client_credentials"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    code_challenge_methods_supported: ["S256", "plain"],
    scopes_supported: ["api_search"],
  });
});

// OAuth 2.1 Authorization Code + PKCE endpoint (browser login flow).
mcpRoutes.get("/oauth/authorize", async (c) => {
  const params = c.req.query();
  const responseType = valueAsString(params.response_type);
  const clientId = valueAsString(params.client_id);
  const redirectUri = valueAsString(params.redirect_uri);
  const state = valueAsString(params.state);
  const scope = valueAsString(params.scope) || "api_search";
  const codeChallenge = valueAsString(params.code_challenge);
  const codeChallengeMethod = (valueAsString(params.code_challenge_method) || "S256").toUpperCase();

  if (responseType !== "code") {
    return oauthAuthorizeError(c, redirectUri, "unsupported_response_type", state);
  }
  if (!clientId || !redirectUri || !isAllowedRedirectUri(redirectUri)) {
    return c.json({ error: "invalid_request", error_description: "Invalid or missing client_id/redirect_uri." }, 400);
  }
  if (!codeChallenge) {
    return oauthAuthorizeError(c, redirectUri, "invalid_request", state, "Missing code_challenge.");
  }
  if (codeChallengeMethod !== "S256" && codeChallengeMethod !== "PLAIN") {
    return oauthAuthorizeError(c, redirectUri, "invalid_request", state, "Unsupported code_challenge_method.");
  }

  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    const requestUrl = new URL(c.req.url);
    const returnTo = encodeURIComponent(requestUrl.pathname + requestUrl.search);
    return c.redirect(`/login?return_to=${returnTo}`, 302);
  }

  const code = randomToken("dak_oac");
  await c.env.DB.prepare(
    `INSERT INTO oauth_authorization_codes
      (id, code, user_id, client_id, redirect_uri, scope, code_challenge, code_challenge_method, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+10 minutes'))`
  )
    .bind(
      crypto.randomUUID(),
      code,
      session.user.id,
      clientId,
      redirectUri,
      scope,
      codeChallenge,
      codeChallengeMethod
    )
    .run();

  const out = new URL(redirectUri);
  out.searchParams.set("code", code);
  if (state) out.searchParams.set("state", state);
  return c.redirect(out.toString(), 302);
});

// Token endpoint: supports auth code (+ PKCE) and client_credentials (API key bridge).
mcpRoutes.post("/oauth/token", (c) => {
  const body = c.req.header("content-type")?.includes("application/json")
    ? c.req.json().catch(() => ({}))
    : c.req.parseBody();

  return Promise.resolve(body).then(async (payload) => {
    const grantType = valueAsString(payload.grant_type);
    const scope = valueAsString(payload.scope) || "api_search";

    if (grantType === "authorization_code") {
      const code = valueAsString(payload.code);
      const clientId = valueAsString(payload.client_id);
      const redirectUri = valueAsString(payload.redirect_uri);
      const codeVerifier = valueAsString(payload.code_verifier);
      if (!code || !clientId || !redirectUri || !codeVerifier) {
        return c.json({ error: "invalid_request" }, 400);
      }
      const row = await c.env.DB.prepare(
        `SELECT id, user_id, client_id, redirect_uri, scope, code_challenge, code_challenge_method
         FROM oauth_authorization_codes
         WHERE code = ? AND used_at IS NULL AND expires_at > datetime('now')`
      )
        .bind(code)
        .first<{
          id: string;
          user_id: string;
          client_id: string;
          redirect_uri: string;
          scope: string;
          code_challenge: string;
          code_challenge_method: string;
        }>();
      if (!row) return c.json({ error: "invalid_grant" }, 400);
      if (row.client_id !== clientId || row.redirect_uri !== redirectUri) {
        return c.json({ error: "invalid_grant" }, 400);
      }
      const method = (row.code_challenge_method || "S256").toUpperCase();
      const validPkce = method === "PLAIN"
        ? row.code_challenge === codeVerifier
        : row.code_challenge === (await sha256Base64Url(codeVerifier));
      if (!validPkce) return c.json({ error: "invalid_grant" }, 400);

      const consume = await c.env.DB.prepare(
        "UPDATE oauth_authorization_codes SET used_at = datetime('now') WHERE id = ? AND used_at IS NULL"
      )
        .bind(row.id)
        .run();
      if ((consume.meta.changes ?? 0) !== 1) return c.json({ error: "invalid_grant" }, 400);

      const accessToken = randomToken("dak_oat");
      const tokenHash = await hashApiKey(accessToken);
      await c.env.DB.prepare(
        `INSERT INTO oauth_access_tokens (id, user_id, hash, scope, expires_at)
         VALUES (?, ?, ?, ?, datetime('now', '+1 hour'))`
      )
        .bind(crypto.randomUUID(), row.user_id, tokenHash, row.scope || scope)
        .run();

      return c.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        scope: row.scope || scope,
      });
    }

    const clientSecret = valueAsString(payload.client_secret);

    if (grantType !== "client_credentials") {
      return c.json({ error: "unsupported_grant_type" }, 400);
    }
    if (!clientSecret) {
      return c.json({ error: "invalid_client" }, 401);
    }

    const verified = await verifyApiKey(c.env.DB, clientSecret);
    if (!verified) {
      return c.json({ error: "invalid_client" }, 401);
    }

    return c.json({
      access_token: clientSecret,
      token_type: "Bearer",
      scope,
    });
  });
});

function requestBaseUrl(url: string, host?: string): string {
  const parsed = new URL(url);
  const protocol = parsed.protocol || "https:";
  const authority = host?.trim() || parsed.host;
  return `${protocol}//${authority}`;
}

function valueAsString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0] && typeof value[0] === "string") return value[0];
  return "";
}

async function sha256Base64Url(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  let b64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return b64;
}

function randomToken(prefix: string): string {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  const token = btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${prefix}_${token}`;
}

function isAllowedRedirectUri(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);
    if (url.hash) return false;
    if (url.protocol === "https:") return true;
    if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

function oauthAuthorizeError(
  c: Context<HonoEnv>,
  redirectUri: string,
  error: string,
  state: string,
  errorDescription?: string
) {
  if (!isAllowedRedirectUri(redirectUri)) {
    return c.json({ error, ...(errorDescription ? { error_description: errorDescription } : {}) }, 400);
  }
  const out = new URL(redirectUri);
  out.searchParams.set("error", error);
  if (state) out.searchParams.set("state", state);
  if (errorDescription) out.searchParams.set("error_description", errorDescription);
  return c.redirect(out.toString(), 302);
}

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function jsonRpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
