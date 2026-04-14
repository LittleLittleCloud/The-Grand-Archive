import { Database } from "bun:sqlite";

const DB_PATH = process.env.DB_PATH ?? "./data/dak.db";

let db: Database;

export function initDb(): Database {
  db = new Database(DB_PATH, { create: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA foreign_keys = ON");
  runMigrations(db);
  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

function runMigrations(db: Database) {
  // Better Auth manages users, sessions, account, verification tables.
  // We only manage business tables and api_keys here.
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      content     TEXT,
      url         TEXT,
      source      TEXT NOT NULL,
      category    TEXT NOT NULL,
      tags        TEXT,
      author      TEXT,
      language    TEXT DEFAULT 'en',
      published   TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id          TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      prefix      TEXT NOT NULL,
      hash        TEXT NOT NULL,
      last_used   TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category);
    CREATE INDEX IF NOT EXISTS idx_entries_source ON entries(source);
    CREATE INDEX IF NOT EXISTS idx_entries_published ON entries(published);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(hash);
  `);

  // Migration: normalize RFC-822 published dates to ISO 8601
  normalizePublishedDates(db);
}

/**
 * One-time migration: convert RFC-822 dates (e.g. "Wed, 08 Apr 2026 16:40:10 GMT")
 * to ISO 8601 ("2026-04-08T16:40:10.000Z") so ORDER BY / range filters work correctly.
 */
function normalizePublishedDates(db: Database) {
  const rows = db
    .query(
      `SELECT id, published FROM entries WHERE published NOT LIKE '____-__-%'`
    )
    .all() as { id: string; published: string }[];

  if (rows.length === 0) {
    console.log("✅ All published dates are already ISO 8601");
    return;
  }

  console.log(`🔧 Normalizing ${rows.length} non-ISO published dates...`);

  const update = db.prepare(
    `UPDATE entries SET published = ? WHERE id = ?`
  );

  const migrate = db.transaction(() => {
    for (const row of rows) {
      const d = new Date(row.published);
      if (isNaN(d.getTime())) continue;
      update.run(d.toISOString(), row.id);
    }
  });

  migrate();
  console.log(`✅ Normalized ${rows.length} dates to ISO 8601`);
}
