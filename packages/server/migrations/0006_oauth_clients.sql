-- 0006_oauth_clients: Dynamic OAuth client registration metadata

CREATE TABLE IF NOT EXISTS oauth_clients (
  id                              TEXT PRIMARY KEY,
  client_id                       TEXT NOT NULL UNIQUE,
  client_name                     TEXT,
  redirect_uris                   TEXT NOT NULL,
  grant_types                     TEXT NOT NULL,
  response_types                  TEXT NOT NULL,
  token_endpoint_auth_method      TEXT NOT NULL DEFAULT 'none',
  created_at                      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_oauth_clients_client_id
  ON oauth_clients(client_id);
