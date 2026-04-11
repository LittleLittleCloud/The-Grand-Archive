import { Hono } from "hono";
import type { Context, Next } from "hono";
import { ApiKeyCreateRequestSchema } from "@dak/contract";
import { generateApiKey } from "../auth/api-key";
import { getDb } from "../db/client";

export const authRoutes = new Hono();

// ─── Auth guard ─────────────────────────────────────────
// userId is set by tierMiddleware (via Better Auth session or API key)

function requireAuth() {
  return async (c: Context, next: Next) => {
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
  const { key, prefix, hash } = generateApiKey();
  const db = getDb();

  const id = crypto.randomUUID();
  db.query(
    "INSERT INTO api_keys (id, user_id, name, prefix, hash) VALUES (?, ?, ?, ?, ?)"
  ).run(id, userId, parsed.data.name, prefix, hash);

  return c.json({ key, id, name: parsed.data.name, prefix }, 201);
});

authRoutes.get("/api-keys", requireAuth(), (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();
  const keys = db
    .query(
      "SELECT id, name, prefix, last_used, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId);

  return c.json(keys);
});

authRoutes.delete("/api-keys/:id", requireAuth(), (c) => {
  const userId = c.get("userId") as string;
  const keyId = c.req.param("id");
  const db = getDb();

  const result = db
    .query("DELETE FROM api_keys WHERE id = ? AND user_id = ?")
    .run(keyId!, userId!);

  if (result.changes === 0) {
    return c.json({ error: "API key not found", code: "NOT_FOUND" }, 404);
  }

  return c.json({ ok: true });
});
