-- 0003_digest: daily digest subscriptions + generated newspaper editions

-- Email subscribers to the daily digest. Standalone email capture (no account
-- required); user_id optionally links to a Better Auth user when logged in.
CREATE TABLE IF NOT EXISTS subscribers (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email           TEXT NOT NULL UNIQUE,
  lang            TEXT NOT NULL DEFAULT 'en',
  -- pending (awaiting double opt-in) | active | unsubscribed
  status          TEXT NOT NULL DEFAULT 'pending',
  confirm_token   TEXT,
  unsub_token     TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at    TEXT,
  unsubscribed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscribers_status_lang ON subscribers(status, lang);
-- SQLite allows multiple NULLs in a UNIQUE index, so cleared tokens don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_confirm_token ON subscribers(confirm_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_unsub_token ON subscribers(unsub_token);

-- One generated newspaper edition per (date, lang). Regenerating overwrites via
-- INSERT ... ON CONFLICT(date, lang) DO UPDATE.
CREATE TABLE IF NOT EXISTS digest_editions (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date          TEXT NOT NULL,   -- YYYY-MM-DD (UTC)
  lang          TEXT NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT,            -- standfirst / dek for listing + meta tags
  html          TEXT NOT NULL,   -- rendered newspaper article body (no email chrome)
  sections_json TEXT,            -- structured sections (for re-rendering / API)
  -- draft | published
  status        TEXT NOT NULL DEFAULT 'published',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(date, lang)
);

CREATE INDEX IF NOT EXISTS idx_digest_editions_date ON digest_editions(date DESC);
