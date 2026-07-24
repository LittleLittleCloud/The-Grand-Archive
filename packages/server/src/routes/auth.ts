import { Hono } from "hono";
import type { Context, Next } from "hono";
import { ApiKeyCreateRequestSchema } from "@dak/contract";
import { generateApiKey } from "../auth/api-key";
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
