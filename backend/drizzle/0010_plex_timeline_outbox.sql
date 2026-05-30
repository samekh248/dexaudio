CREATE TABLE IF NOT EXISTS "plex_timeline_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payload" jsonb NOT NULL,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "status" "scrobble_status" DEFAULT 'pending' NOT NULL,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
