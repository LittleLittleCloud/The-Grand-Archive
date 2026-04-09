import type { Context, Next } from "hono";
import { sign, verify } from "hono/jwt";
import { getDb } from "../db/client";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "dak_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionPayload {
  sub: string; // userId
  jti: string; // sessionId
  exp: number;
}

/**
 * Create a session for the user. Returns JWT token.
 */
export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  db.query("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    sessionId,
    userId,
    expiresAt
  );

  const payload: SessionPayload = {
    sub: userId,
    jti: sessionId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };

  const jwtPayload: Record<string, unknown> = {
    sub: payload.sub,
    jti: payload.jti,
    exp: payload.exp,
  };

  return sign(jwtPayload, JWT_SECRET, "HS256");
}

/**
 * Middleware: extract + verify session from cookie.
 * Sets c.set("userId", ...) and c.set("sessionId", ...) if valid.
 * Does NOT reject — just sets or skips. Use requireSession() for protected routes.
 */
export function sessionMiddleware() {
  return async (c: Context, next: Next) => {
    const cookie = getCookie(c, COOKIE_NAME);
    if (cookie) {
      try {
        const payload = (await verify(cookie, JWT_SECRET, "HS256")) as unknown as SessionPayload;
        // Check session exists in DB (not revoked)
        const db = getDb();
        const session = db
          .query("SELECT id FROM sessions WHERE id = ? AND expires_at > datetime('now')")
          .get(payload.jti) as { id: string } | null;

        if (session) {
          c.set("userId", payload.sub);
          c.set("sessionId", payload.jti);
        }
      } catch {
        // Invalid or expired JWT — ignore
      }
    }
    await next();
  };
}

/**
 * Middleware: require valid session. Returns 401 if not authenticated.
 */
export function requireSession() {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }
    await next();
  };
}

/**
 * Set session cookie on response.
 */
export function setSessionCookie(c: Context, token: string) {
  c.header(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`
  );
}

/**
 * Clear session cookie.
 */
export function clearSessionCookie(c: Context) {
  c.header(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
}

/**
 * Revoke session in DB.
 */
export function revokeSession(sessionId: string) {
  const db = getDb();
  db.query("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

/** Simple cookie parser */
function getCookie(c: Context, name: string): string | undefined {
  const header = c.req.header("Cookie");
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1];
}
