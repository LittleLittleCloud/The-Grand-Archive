import { Hono } from "hono";
import type { Context } from "hono";
import { SearchRequestSchema, DigestSubscribeRequestSchema, DigestLangSchema, type DigestLang, type DigestSection } from "@dak/contract";
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

const API_DIGEST_SUBSCRIBE_TOOL = {
  name: "api_digest_subscribe",
  description: "Subscribe an email to The Grand Archive daily digest (double opt-in).",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      email: { type: "string", format: "email" },
      lang: { type: "string", enum: ["en", "zh"], default: "en" },
    },
    required: ["email"],
  },
} as const;

const API_DIGEST_EDITIONS_TOOL = {
  name: "api_digest_editions",
  description: "List published digest editions.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      lang: { type: "string", enum: ["en", "zh"] },
      limit: { type: "number", minimum: 1, maximum: 200, default: 60 },
    },
  },
} as const;

const API_DIGEST_EDITION_TOOL = {
  name: "api_digest_edition",
  description: "Read one published digest edition by date and language.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "YYYY-MM-DD" },
      lang: { type: "string", enum: ["en", "zh"] },
    },
    required: ["date", "lang"],
  },
} as const;

const MCP_TOOLS = [
  API_SEARCH_TOOL,
  API_DIGEST_SUBSCRIBE_TOOL,
  API_DIGEST_EDITIONS_TOOL,
  API_DIGEST_EDITION_TOOL,
] as const;

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
    return c.json(jsonRpcResult(body.id, { tools: MCP_TOOLS }));
  }

  if (body.method === "tools/call") {
    const params = body.params ?? {};
    const toolName = typeof params.name === "string" ? params.name : "";
    if (toolName === "api_search") {
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
      return c.json(jsonRpcResult(body.id, asToolResult(payload)));
    }

    if (toolName === "api_digest_subscribe") {
      const parsed = DigestSubscribeRequestSchema.safeParse(params.arguments ?? {});
      if (!parsed.success) {
        return c.json(jsonRpcError(body.id, -32602, parsed.error.issues.map((i) => i.message).join("; ")));
      }

      const email = parsed.data.email.trim().toLowerCase();
      const lang = parsed.data.lang;
      const userId = (c.get("userId") as string | undefined) ?? null;
      const existing = await c.env.DB
        .prepare("SELECT id, status FROM subscribers WHERE email = ?")
        .bind(email)
        .first<{ id: string; status: string }>();
      if (existing?.status === "active") {
        return c.json(jsonRpcResult(body.id, asToolResult({ status: "active", message: "You are already subscribed." })));
      }
      const confirmToken = crypto.randomUUID();
      if (existing) {
        await c.env.DB
          .prepare(
            "UPDATE subscribers SET lang = ?, status = 'pending', confirm_token = ?, user_id = COALESCE(?, user_id) WHERE id = ?"
          )
          .bind(lang, confirmToken, userId, existing.id)
          .run();
      } else {
        await c.env.DB
          .prepare(
            "INSERT INTO subscribers (email, lang, status, confirm_token, user_id) VALUES (?, ?, 'pending', ?, ?)"
          )
          .bind(email, lang, confirmToken, userId)
          .run();
      }
      return c.json(
        jsonRpcResult(
          body.id,
          asToolResult({
            status: "pending",
            message: "Almost there — check your inbox to confirm your subscription.",
          })
        )
      );
    }

    if (toolName === "api_digest_editions") {
      const args = objectArgs(params.arguments);
      const lang = DigestLangSchema.safeParse(args.lang);
      const limit = Math.min(Math.max(Number(args.limit) || 60, 1), 200);
      let stmt;
      if (lang.success) {
        stmt = c.env.DB.prepare(
          "SELECT date, lang, title, summary FROM digest_editions WHERE status = 'published' AND lang = ? ORDER BY date DESC LIMIT ?"
        ).bind(lang.data, limit);
      } else {
        stmt = c.env.DB.prepare(
          "SELECT date, lang, title, summary FROM digest_editions WHERE status = 'published' ORDER BY date DESC, lang LIMIT ?"
        ).bind(limit);
      }
      const editions = (await stmt.all()).results ?? [];
      return c.json(jsonRpcResult(body.id, asToolResult({ editions })));
    }

    if (toolName === "api_digest_edition") {
      const args = objectArgs(params.arguments);
      const date = valueAsString(args.date);
      const langParsed = DigestLangSchema.safeParse(args.lang);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !langParsed.success) {
        return c.json(jsonRpcError(body.id, -32602, "date must be YYYY-MM-DD and lang must be 'en' or 'zh'."));
      }
      const row = await c.env.DB.prepare(
        "SELECT date, lang, title, summary, html, sections_json, created_at FROM digest_editions WHERE date = ? AND lang = ? AND status = 'published'"
      )
        .bind(date, langParsed.data)
        .first<{
          date: string;
          lang: DigestLang;
          title: string;
          summary: string | null;
          html: string;
          sections_json: string | null;
          created_at: string;
        }>();
      if (!row) return c.json(jsonRpcError(body.id, -32004, "Digest edition not found."));

      let sections: DigestSection[] = [];
      if (row.sections_json) {
        try {
          sections = JSON.parse(row.sections_json) as DigestSection[];
        } catch {
          sections = [];
        }
      }
      const payload = {
        date: row.date,
        lang: row.lang,
        title: row.title,
        summary: row.summary,
        html: row.html,
        sections,
        created_at: row.created_at,
      };
      return c.json(jsonRpcResult(body.id, asToolResult(payload)));
    }

    return c.json(jsonRpcError(body.id, -32601, `Tool not found: ${toolName || "(empty)"}`));
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
    authorization_server: base,
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
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "client_credentials"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    registration_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256", "plain"],
    scopes_supported: ["api_search"],
  });
});

// OAuth 2.0 dynamic client registration (RFC 7591) for public PKCE clients.
mcpRoutes.post("/oauth/register", async (c) => {
  const payload = c.req.header("content-type")?.includes("application/json")
    ? await c.req.json().catch(() => ({}))
    : await c.req.parseBody();

  const redirectUris = asStringArray(payload.redirect_uris).filter(isAllowedRedirectUri);
  if (redirectUris.length === 0) {
    return c.json({ error: "invalid_redirect_uri" }, 400);
  }

  const tokenEndpointAuthMethod = valueAsString(payload.token_endpoint_auth_method) || "none";
  if (tokenEndpointAuthMethod !== "none") {
    return c.json({ error: "invalid_client_metadata" }, 400);
  }

  const clientId = randomToken("dak_client");
  const clientName = valueAsString(payload.client_name);
  const grantTypes = ["authorization_code"];
  const responseTypes = ["code"];

  await c.env.DB.prepare(
    `INSERT INTO oauth_clients
      (id, client_id, client_name, redirect_uris, grant_types, response_types, token_endpoint_auth_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      clientId,
      clientName || null,
      JSON.stringify(redirectUris),
      JSON.stringify(grantTypes),
      JSON.stringify(responseTypes),
      tokenEndpointAuthMethod
    )
    .run();

  return c.json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: clientName || undefined,
    redirect_uris: redirectUris,
    grant_types: grantTypes,
    response_types: responseTypes,
    token_endpoint_auth_method: tokenEndpointAuthMethod,
  }, 201);
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
  const registeredClient = await c.env.DB.prepare(
    "SELECT redirect_uris FROM oauth_clients WHERE client_id = ?"
  )
    .bind(clientId)
    .first<{ redirect_uris: string | null }>();
  if (registeredClient?.redirect_uris) {
    const allowedRedirectUris = safeParseStringArray(registeredClient.redirect_uris);
    if (!allowedRedirectUris.includes(redirectUri)) {
      return oauthAuthorizeError(c, redirectUri, "invalid_request", state, "Unregistered redirect_uri.");
    }
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

function objectArgs(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

function safeParseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
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

function asToolResult(payload: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}
