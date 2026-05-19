CREATE TABLE IF NOT EXISTS artist_spotlight_state (
  artist_id text PRIMARY KEY,
  last_spotlighted_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artist_spotlight_state_last_shown
  ON artist_spotlight_state (last_spotlighted_at ASC);
