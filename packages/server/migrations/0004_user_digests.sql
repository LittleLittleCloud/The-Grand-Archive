-- 0004_user_digests: user-published newspaper editions (CRUD, no server LLM).
-- A logged-in user (typically via their own agent + API key) submits a complete,
-- schema-valid DigestContent; the server validates, renders HTML, and stores it.
-- Private by default; sharing flips visibility to 'public' (link-only access via
-- the unguessable share_id — public digests are never listed or indexed).

CREATE TABLE IF NOT EXISTS user_digests (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  -- Unguessable public handle so private digests can't be enumerated.
  share_id      TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
  author_id     TEXT NOT NULL,
  lang          TEXT NOT NULL DEFAULT 'en',
  date          TEXT NOT NULL,                 -- YYYY-MM-DD (UTC)
  title         TEXT NOT NULL,
  summary       TEXT,                          -- standfirst / dek for listing
  content_json  TEXT NOT NULL,                 -- the validated DigestContent
  html          TEXT NOT NULL,                 -- pre-rendered, escaped article HTML
  -- private (default) | public (shareable, link-only)
  visibility    TEXT NOT NULL DEFAULT 'private',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  published_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_digests_author ON user_digests(author_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_digests_share ON user_digests(share_id);
