ALTER TABLE "lastfm_accounts" ADD COLUMN IF NOT EXISTS "sync_started_at" timestamp with time zone;
