-- 0007_oauth_client_secret: support confidential OAuth clients (e.g. Claude)
-- Adds an optional client secret hash. NULL means the client is public (PKCE only).

ALTER TABLE oauth_clients ADD COLUMN client_secret_hash TEXT;
