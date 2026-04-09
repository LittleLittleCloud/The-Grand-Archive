import { getDb } from "../db/client";

const DAK_KEY_PREFIX = "dak_";

/** Generate a new API key. Returns the full plaintext key (show only once). */
export function generateApiKey(): {
  key: string;
  prefix: string;
  hash: string;
} {
  const raw = crypto.randomUUID();
  const key = `${DAK_KEY_PREFIX}${raw}`;
  const prefix = key.slice(0, 8);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

/** SHA-256 hash of a key for storage. */
export function hashApiKey(key: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(key);
  return hasher.digest("hex");
}

/** Look up user by API key. Returns userId or null. */
export function verifyApiKey(
  key: string
): { userId: string; keyId: string } | null {
  const db = getDb();
  const hash = hashApiKey(key);
  const row = db
    .query(
      "SELECT id, user_id FROM api_keys WHERE hash = ?"
    )
    .get(hash) as { id: string; user_id: string } | null;

  if (!row) return null;

  // Update last_used
  db.query("UPDATE api_keys SET last_used = datetime('now') WHERE id = ?").run(
    row.id
  );

  return { userId: row.user_id, keyId: row.id };
}
