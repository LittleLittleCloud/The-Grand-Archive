import type { Context, Next } from "hono";
import { verifyApiKey } from "../auth/api-key";

/**
 * Middleware: extract + verify API key from Authorization header or X-API-Key.
 * Sets c.set("userId", ...) if valid. Does NOT reject — use requireApiKey() for that.
 */
export function apiKeyMiddleware() {
  return async (c: Context, next: Next) => {
    // Skip if already authenticated via session
    if (c.get("userId")) {
      await next();
      return;
    }

    const key = extractApiKey(c);
    if (key) {
      const result = verifyApiKey(key);
      if (result) {
        c.set("userId", result.userId);
        c.set("apiKeyId", result.keyId);
      }
    }
    await next();
  };
}

/**
 * Middleware: require valid API key. Returns 401 if not authenticated.
 */
export function requireApiKey() {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Unauthorized", code: "API_KEY_REQUIRED" }, 401);
    }
    await next();
  };
}

function extractApiKey(c: Context): string | undefined {
  // Check Authorization: Bearer dak_xxx
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check X-API-Key header
  return c.req.header("X-API-Key") ?? undefined;
}
