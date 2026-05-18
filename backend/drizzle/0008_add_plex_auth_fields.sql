ALTER TABLE plex_connections
  ADD COLUMN IF NOT EXISTS machine_identifier text,
  ADD COLUMN IF NOT EXISTS server_name text,
  ADD COLUMN IF NOT EXISTS account_id text,
  ADD COLUMN IF NOT EXISTS account_username text,
  ADD COLUMN IF NOT EXISTS account_avatar_url text,
  ADD COLUMN IF NOT EXISTS account_email text,
  ADD COLUMN IF NOT EXISTS account_token_encrypted bytea;
