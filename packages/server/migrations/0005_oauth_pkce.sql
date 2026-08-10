-- 0005_oauth_pkce: OAuth 2.1 authorization code + PKCE support

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  user_id               TEXT NOT NULL,
  client_id             TEXT NOT NULL,
  redirect_uri          TEXT NOT NULL,
  scope                 TEXT,
  code_challenge        TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  expires_at            TEXT NOT NULL,
  used_at               TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_code
  ON oauth_authorization_codes(code);

CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  hash       TEXT NOT NULL UNIQUE,
  scope      TEXT,
  expires_at TEXT,
  last_used  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_hash
  ON oauth_access_tokens(hash);
