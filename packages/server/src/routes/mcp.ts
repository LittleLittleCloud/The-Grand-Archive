import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import {
  SearchRequestSchema,
  UserDigestCreateRequestSchema,
  ApiKeyCreateRequestSchema,
  DigestContentSchema,
  renderEditionArticle,
  type DigestContent,
  type DigestLang,
  type UserDigest,
  type UserDigestSummary,
} from "@dak/contract";
import type { HonoEnv } from "../types";
import { search } from "../search/engine";
import { generateApiKey } from "../auth/api-key";

export const mcpRoutes = new Hono<HonoEnv>();

/** JSON Schema for a structured digest edition, derived from the Zod source of truth. */
const DIGEST_CONTENT_SCHEMA = z.toJSONSchema(DigestContentSchema);

const DAK_SEARCH_TOOL = {
  name: "dak_search",
  description:
    "Search the Grand Archive news index with optional category/source/date filters. " +
    "Works without authentication, but the caller's tier affects results: unauthenticated calls run " +
    "at the anonymous tier (10 req/min, history limited to the last ~28 days). Authenticating with an " +
    "API key or OAuth raises the limit to the free tier (30 req/min, ~28 days); premium accounts get " +
    "120 req/min and ~90 days of history. The response reports the resolved `tier`, and sets " +
    "`tierCutoff` to the cutoff date when older matches were hidden by the tier's history window.",
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

const DAK_DIGEST_PUBLISH_TOOL = {
  name: "dak_digest_publish",
  description: "Publish a digest owned by the authenticated user. Requires auth.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      lang: { type: "string", enum: ["en", "zh"], default: "en" },
      date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "YYYY-MM-DD (defaults to today)" },
      content: DIGEST_CONTENT_SCHEMA,
    },
    required: ["content"],
  },
} as const;

const DAK_DIGEST_LIST_TOOL = {
  name: "dak_digest_list",
  description: "List the authenticated user's digests (newest first). Requires auth.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
} as const;

const DAK_DIGEST_DELETE_TOOL = {
  name: "dak_digest_delete",
  description: "Delete one of the authenticated user's digests by id. Requires auth.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string", description: "Digest id" },
    },
    required: ["id"],
  },
} as const;

const DAK_API_KEY_CREATE_TOOL = {
  name: "dak_api_key_create",
  description: "Create a new API key for the authenticated user. The full key is returned once. Requires auth.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 1, maxLength: 64, description: "Human-readable key name" },
    },
    required: ["name"],
  },
} as const;

const MCP_TOOLS = [
  DAK_SEARCH_TOOL,
  DAK_DIGEST_PUBLISH_TOOL,
  DAK_DIGEST_LIST_TOOL,
  DAK_DIGEST_DELETE_TOOL,
  DAK_API_KEY_CREATE_TOOL,
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
    if (toolName === "dak_search") {
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

    if (toolName === "dak_digest_publish") {
      const parsed = UserDigestCreateRequestSchema.safeParse(params.arguments ?? {});
      if (!parsed.success) {
        return c.json(jsonRpcError(body.id, -32602, parsed.error.issues.map((i) => i.message).join("; ")));
      }
      const userId = (c.get("userId") as string | undefined) ?? null;
      if (!userId) return mcpUnauthorized(c, body.id);

      const { lang, date, content } = parsed.data;
      const editionDate = date ?? new Date().toISOString().slice(0, 10);
      const html = renderEditionArticle(content, lang);
      const row = await c.env.DB.prepare(
        `INSERT INTO user_digests (author_id, lang, date, title, summary, content_json, html)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      )
        .bind(userId, lang, editionDate, content.title, content.standfirst, JSON.stringify(content), html)
        .first<DigestRow>();
      if (!row) return c.json(jsonRpcError(body.id, -32603, "Insert failed."));
      return c.json(jsonRpcResult(body.id, asToolResult(toUserDigest(row))));
    }

    if (toolName === "dak_digest_list") {
      const userId = (c.get("userId") as string | undefined) ?? null;
      if (!userId) return mcpUnauthorized(c, body.id);
      const rows =
        (
          await c.env.DB.prepare(
            "SELECT * FROM user_digests WHERE author_id = ? ORDER BY created_at DESC"
          )
            .bind(userId)
            .all<DigestRow>()
        ).results ?? [];
      return c.json(jsonRpcResult(body.id, asToolResult({ digests: rows.map(toSummary) })));
    }

    if (toolName === "dak_digest_delete") {
      const args = objectArgs(params.arguments);
      const id = valueAsString(args.id);
      if (!id) return c.json(jsonRpcError(body.id, -32602, "id is required."));
      const userId = (c.get("userId") as string | undefined) ?? null;
      if (!userId) return mcpUnauthorized(c, body.id);
      const res = await c.env.DB.prepare(
        "DELETE FROM user_digests WHERE id = ? AND author_id = ?"
      )
        .bind(id, userId)
        .run();
      if ((res.meta.changes ?? 0) === 0) return c.json(jsonRpcError(body.id, -32004, "Digest not found."));
      return c.json(jsonRpcResult(body.id, asToolResult({ ok: true, id })));
    }

    if (toolName === "dak_api_key_create") {
      const parsed = ApiKeyCreateRequestSchema.safeParse(params.arguments ?? {});
      if (!parsed.success) {
        return c.json(jsonRpcError(body.id, -32602, parsed.error.issues.map((i) => i.message).join("; ")));
      }
      const userId = (c.get("userId") as string | undefined) ?? null;
      if (!userId) return mcpUnauthorized(c, body.id);
      const { key, prefix, hash } = await generateApiKey();
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        "INSERT INTO api_keys (id, user_id, name, prefix, hash) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(id, userId, parsed.data.name, prefix, hash)
        .run();
      return c.json(jsonRpcResult(body.id, asToolResult({ key, id, name: parsed.data.name, prefix })));
    }

    return c.json(jsonRpcError(body.id, -32601, `Tool not found: ${toolName || "(empty)"}`));
  }

  if (notification) return c.body(null, 202);
  return c.json(jsonRpcError(body.id, -32601, `Method not found: ${body.method}`));
});

function valueAsString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0] && typeof value[0] === "string") return value[0];
  return "";
}

function objectArgs(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

interface DigestRow {
  id: string;
  share_id: string;
  author_id: string;
  lang: string;
  date: string;
  title: string;
  summary: string | null;
  content_json: string;
  html: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

function toSummary(row: DigestRow): UserDigestSummary {
  return {
    id: row.id,
    shareId: row.share_id,
    lang: row.lang as DigestLang,
    date: row.date,
    title: row.title,
    summary: row.summary,
    visibility: row.visibility as "private" | "public",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function toUserDigest(row: DigestRow): UserDigest {
  return {
    ...toSummary(row),
    html: row.html,
    content: JSON.parse(row.content_json) as DigestContent,
  };
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

/**
 * Reject an unauthenticated MCP tool call with HTTP 401 + a RFC 9728
 * `WWW-Authenticate` header pointing at the protected-resource metadata. This is
 * what lets OAuth-aware MCP clients (e.g. VS Code) discover the authorization
 * server and start the login flow, instead of silently receiving an in-band
 * JSON-RPC error. The JSON-RPC error body is retained for non-OAuth clients.
 */
function mcpUnauthorized(c: Context<HonoEnv>, id: JsonRpcRequest["id"]) {
  const url = new URL(c.req.url);
  const base = `${url.protocol}//${c.req.header("host") ?? url.host}`;
  const resourceMetadata = `${base}/.well-known/oauth-protected-resource`;
  c.header("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadata}"`);
  return c.json(jsonRpcError(id, -32001, "Authentication required."), 401);
}

function asToolResult(payload: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}
