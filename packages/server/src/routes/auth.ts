import { Hono } from "hono";
import type { Context, Next } from "hono";
import { ApiKeyCreateRequestSchema, OAuthClientCreateRequestSchema } from "@dak/contract";
import { generateApiKey } from "../auth/api-key";
import { randomToken, isAllowedRedirectUri } from "./oauth";
import type { HonoEnv } from "../types";

export const authRoutes = new Hono<HonoEnv>();

// ─── Auth guard ─────────────────────────────
// userId is set by tierMiddleware (via Better Auth session or API key)

function requireAuth() {
  return async (c: Context<HonoEnv>, next: Next) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }
    await next();
  };
}

// ─── API Keys ───────────────────────────────────────────

authRoutes.post("/api-keys", requireAuth(), async (c) => {
  const body = await c.req.json();
  const parsed = ApiKeyCreateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Validation error", code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
      400
    );
  }

  const userId = c.get("userId") as string;
  const { key, prefix, hash } = await generateApiKey();
  const db = c.env.DB;

  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO api_keys (id, user_id, name, prefix, hash) VALUES (?, ?, ?, ?, ?)")
    .bind(id, userId, parsed.data.name, prefix, hash)
    .run();

  return c.json({ key, id, name: parsed.data.name, prefix }, 201);
});

authRoutes.get("/api-keys", requireAuth(), async (c) => {
  const userId = c.get("userId") as string;
  const db = c.env.DB;
  const keys = (
    await db
      .prepare(
        "SELECT id, name, prefix, last_used, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC"
      )
      .bind(userId)
      .all()
  ).results;

  return c.json(keys);
});

authRoutes.delete("/api-keys/:id", requireAuth(), async (c) => {
  const userId = c.get("userId") as string;
  const keyId = c.req.param("id");
  const db = c.env.DB;

  const result = await db
    .prepare("DELETE FROM api_keys WHERE id = ? AND user_id = ?")
    .bind(keyId, userId)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "API key not found", code: "NOT_FOUND" }, 404);
  }

  return c.json({ ok: true });
});

// ─── OAuth clients ──────────────────────────────────────
// Lists all dynamically-registered OAuth clients (e.g. MCP clients such as
// VS Code). Registration is anonymous/global, so this is not user-scoped.

authRoutes.get("/oauth/clients", requireAuth(), async (c) => {
  const db = c.env.DB;
  const rows = (
    await db
      .prepare(
        "SELECT client_id, client_name, redirect_uris, grant_types, token_endpoint_auth_method, created_at FROM oauth_clients ORDER BY created_at DESC"
      )
      .all<{
        client_id: string;
        client_name: string | null;
        redirect_uris: string | null;
        grant_types: string | null;
        token_endpoint_auth_method: string;
        created_at: string;
      }>()
  ).results ?? [];

  const clients = rows.map((r) => ({
    client_id: r.client_id,
    client_name: r.client_name,
    redirect_uris: safeParseArray(r.redirect_uris),
    grant_types: safeParseArray(r.grant_types),
    token_endpoint_auth_method: r.token_endpoint_auth_method,
    created_at: r.created_at,
  }));

  return c.json(clients);
});

authRoutes.post("/oauth/clients", requireAuth(), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = OAuthClientCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Validation error", code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
      400
    );
  }

  const redirectUris = parsed.data.redirect_uris.filter(isAllowedRedirectUri);
  if (redirectUris.length === 0) {
    return c.json(
      { error: "No valid redirect URIs. Use https:// or http://localhost.", code: "INVALID_REDIRECT_URI" },
      400
    );
  }

  const clientId = randomToken("dak_client");
  const grantTypes = ["authorization_code"];
  const responseTypes = ["code"];
  const authMethod = "none";

  const row = await c.env.DB.prepare(
    `INSERT INTO oauth_clients
      (id, client_id, client_name, redirect_uris, grant_types, response_types, token_endpoint_auth_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING client_id, client_name, redirect_uris, grant_types, token_endpoint_auth_method, created_at`
  )
    .bind(
      crypto.randomUUID(),
      clientId,
      parsed.data.client_name ?? null,
      JSON.stringify(redirectUris),
      JSON.stringify(grantTypes),
      JSON.stringify(responseTypes),
      authMethod
    )
    .first<{
      client_id: string;
      client_name: string | null;
      redirect_uris: string | null;
      grant_types: string | null;
      token_endpoint_auth_method: string;
      created_at: string;
    }>();

  if (!row) return c.json({ error: "Insert failed", code: "INTERNAL_ERROR" }, 500);

  return c.json(
    {
      client_id: row.client_id,
      client_name: row.client_name,
      redirect_uris: safeParseArray(row.redirect_uris),
      grant_types: safeParseArray(row.grant_types),
      token_endpoint_auth_method: row.token_endpoint_auth_method,
      created_at: row.created_at,
    },
    201
  );
});

authRoutes.delete("/oauth/clients/:clientId", requireAuth(), async (c) => {
  const clientId = c.req.param("clientId");
  const result = await c.env.DB.prepare("DELETE FROM oauth_clients WHERE client_id = ?")
    .bind(clientId)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "OAuth client not found", code: "NOT_FOUND" }, 404);
  }

  return c.json({ ok: true });
});

function safeParseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}
