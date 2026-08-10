import { Hono } from "hono";
import { SearchRequestSchema } from "@dak/contract";
import type { HonoEnv } from "../types";
import { search } from "../search/engine";
import { verifyApiKey } from "../auth/api-key";

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
    token_endpoint: `${base}/oauth/token`,
    grant_types_supported: ["client_credentials"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    scopes_supported: ["api_search"],
  });
});

// Minimal token endpoint: exchange an existing API key (client_secret) for a bearer token.
mcpRoutes.post("/oauth/token", (c) => {
  const body = c.req.header("content-type")?.includes("application/json")
    ? c.req.json().catch(() => ({}))
    : c.req.parseBody();

  return Promise.resolve(body).then(async (payload) => {
    const grantType = valueAsString(payload.grant_type);
    const clientSecret = valueAsString(payload.client_secret);
    const scope = valueAsString(payload.scope) || "api_search";

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
