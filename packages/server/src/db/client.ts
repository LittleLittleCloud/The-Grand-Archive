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

    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      username    TEXT UNIQUE NOT NULL,
      email       TEXT UNIQUE,
      password    TEXT NOT NULL,
      role        TEXT DEFAULT 'user',
      plan        TEXT DEFAULT 'free',
      req_balance INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id          TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      user_id     TEXT NOT NULL REFERENCES users(id),
      name        TEXT NOT NULL,
      prefix      TEXT NOT NULL,
      hash        TEXT NOT NULL,
      last_used   TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      expires_at  TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category);
    CREATE INDEX IF NOT EXISTS idx_entries_source ON entries(source);
    CREATE INDEX IF NOT EXISTS idx_entries_published ON entries(published);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);
}
