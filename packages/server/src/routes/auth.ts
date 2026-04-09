import { Hono } from "hono";
import { LoginRequestSchema, RegisterRequestSchema, ApiKeyCreateRequestSchema } from "@dak/contract";
import { hashPassword, verifyPassword } from "../auth/password";
import { generateApiKey } from "../auth/api-key";
import {
  requireSession,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  revokeSession,
} from "../middleware/session";
import { getDb } from "../db/client";

export const authRoutes = new Hono();

// ─── Register ───────────────────────────────────────────

authRoutes.post("/auth/register", async (c) => {
  const body = await c.req.json();
  const parsed = RegisterRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Validation error", code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
      400
    );
  }

  const db = getDb();
  const existing = db
    .query("SELECT id FROM users WHERE username = ?")
    .get(parsed.data.username);

  if (existing) {
    return c.json({ error: "Username already taken", code: "CONFLICT" }, 409);
  }

  const hashed = await hashPassword(parsed.data.password);
  const id = crypto.randomUUID().replaceAll("-", "");
  db.query(
    "INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)"
  ).run(id, parsed.data.username, parsed.data.email ?? null, hashed);

  const token = await createSession(id);
  setSessionCookie(c, token);

  return c.json({ ok: true }, 201);
});

// ─── Login ──────────────────────────────────────────────

authRoutes.post("/auth/login", async (c) => {
  const body = await c.req.json();
  const parsed = LoginRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Validation error", code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") },
      400
    );
  }

  const db = getDb();
  const user = db
    .query("SELECT id, password FROM users WHERE username = ?")
    .get(parsed.data.username) as { id: string; password: string } | null;

  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    return c.json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" }, 401);
  }

  const token = await createSession(user.id);
  setSessionCookie(c, token);

  return c.json({ ok: true });
});

// ─── Logout ─────────────────────────────────────────────

authRoutes.post("/auth/logout", requireSession(), async (c) => {
  const sessionId = c.get("sessionId") as string;
  revokeSession(sessionId);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

// ─── Me ─────────────────────────────────────────────────

authRoutes.get("/auth/me", requireSession(), (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();
  const user = db
    .query(
      "SELECT id, username, email, role, plan, req_balance, created_at FROM users WHERE id = ?"
    )
    .get(userId);

  if (!user) {
    return c.json({ error: "User not found", code: "NOT_FOUND" }, 404);
  }

  return c.json(user);
});

// ─── API Keys ───────────────────────────────────────────

authRoutes.post("/api-keys", requireSession(), async (c) => {
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

authRoutes.get("/api-keys", requireSession(), (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();
  const keys = db
    .query(
      "SELECT id, name, prefix, last_used, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId);

  return c.json(keys);
});

authRoutes.delete("/api-keys/:id", requireSession(), (c) => {
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
