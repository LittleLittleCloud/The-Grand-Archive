-- 0001_init: business tables + FTS5 index
-- Better Auth tables (users, sessions, account, verification) are generated
-- separately by the Better Auth CLI into a later migration.

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

-- Contentless FTS5 index. Stores jieba-tokenized title/body; the application
-- (ingestion + one-time backfill) tokenizes and writes rows keyed by
-- entries.rowid. Not auto-synced by triggers because tokenization needs jieba.
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  title,
  body,
  content='',
  content_rowid='rowid'
);
