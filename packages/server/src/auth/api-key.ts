import type { D1Database } from "@cloudflare/workers-types";

const DAK_KEY_PREFIX = "dak_";

/** Generate a new API key. Returns the full plaintext key (show only once). */
export async function generateApiKey(): Promise<{
  key: string;
  prefix: string;
  hash: string;
}> {
  const raw = crypto.randomUUID();
  const key = `${DAK_KEY_PREFIX}${raw}`;
  const prefix = key.slice(0, 8);
  const hash = await hashApiKey(key);
  return { key, prefix, hash };
}

/** SHA-256 hash of a key for storage (Web Crypto — works on Workers). */
export async function hashApiKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Look up user by API key. Returns userId/keyId or null. */
export async function verifyApiKey(
  db: D1Database,
  key: string
): Promise<{ userId: string; keyId: string } | null> {
  const hash = await hashApiKey(key);
  const row = await db
    .prepare("SELECT id, user_id FROM api_keys WHERE hash = ?")
    .bind(hash)
    .first<{ id: string; user_id: string }>();

  if (!row) return null;

  // Update last_used (fire-and-forget is fine, but await keeps it simple)
  await db
    .prepare("UPDATE api_keys SET last_used = datetime('now') WHERE id = ?")
    .bind(row.id)
    .run();

  return { userId: row.user_id, keyId: row.id };
}

/** Look up user by OAuth bearer access token. Returns userId/tokenId or null. */
export async function verifyOAuthAccessToken(
  db: D1Database,
  token: string
): Promise<{ userId: string; tokenId: string } | null> {
  const hash = await hashApiKey(token);
  const row = await db
    .prepare(
      "SELECT id, user_id FROM oauth_access_tokens WHERE hash = ? AND (expires_at IS NULL OR expires_at > datetime('now'))"
    )
    .bind(hash)
    .first<{ id: string; user_id: string }>();

  if (!row) return null;

  await db
    .prepare("UPDATE oauth_access_tokens SET last_used = datetime('now') WHERE id = ?")
    .bind(row.id)
    .run();

  return { userId: row.user_id, tokenId: row.id };
}
