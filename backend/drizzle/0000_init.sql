CREATE TYPE "public"."match_status" AS ENUM('matched', 'partial', 'not_on_plex');
CREATE TYPE "public"."scrobble_status" AS ENUM('pending', 'submitted', 'dropped');

CREATE TABLE IF NOT EXISTS "plex_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "server_url" text NOT NULL,
  "token_encrypted" bytea NOT NULL,
  "active_library_ids" text[] DEFAULT '{}' NOT NULL,
  "last_validated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "discogs_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text NOT NULL,
  "token_encrypted" bytea NOT NULL,
  "last_sync_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "discogs_releases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "discogs_release_id" bigint NOT NULL UNIQUE,
  "title" text NOT NULL,
  "artist" text NOT NULL,
  "year" integer,
  "format" text,
  "raw_payload" jsonb,
  "synced_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "collection_matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "discogs_release_id" bigint NOT NULL,
  "plex_rating_key" text,
  "status" "match_status" NOT NULL,
  "confidence" numeric(3, 2),
  "match_candidates" jsonb,
  "manual_override" boolean DEFAULT false NOT NULL,
  "matched_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "collection_matches_discogs_release_id_unique" ON "collection_matches" ("discogs_release_id");

CREATE TABLE IF NOT EXISTS "lastfm_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_key_encrypted" bytea,
  "connected" boolean DEFAULT false NOT NULL,
  "last_error" text
);

CREATE TABLE IF NOT EXISTS "scrobble_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "track_title" text NOT NULL,
  "artist" text NOT NULL,
  "album" text NOT NULL,
  "played_at" timestamp with time zone NOT NULL,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "status" "scrobble_status" DEFAULT 'pending' NOT NULL
);

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL
);
