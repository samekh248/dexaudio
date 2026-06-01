DO $$ BEGIN
 CREATE TYPE "public"."scrobble_source" AS ENUM('lastfm', 'plex');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."sync_status" AS ENUM('idle', 'syncing', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scrobbles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"played_at" timestamp with time zone NOT NULL,
	"track" text NOT NULL,
	"artist" text NOT NULL,
	"album" text,
	"artist_mbid" text,
	"album_mbid" text,
	"image_url" text,
	"source" "scrobble_source" NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scrobbles_played_track_artist_unique" ON "scrobbles" USING btree ("played_at","track","artist");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scrobbles_played_at_idx" ON "scrobbles" USING btree ("played_at");
--> statement-breakpoint
ALTER TABLE "lastfm_accounts" ADD COLUMN IF NOT EXISTS "username" text;
--> statement-breakpoint
ALTER TABLE "lastfm_accounts" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "lastfm_accounts" ADD COLUMN IF NOT EXISTS "total_scrobbles" integer;
--> statement-breakpoint
ALTER TABLE "lastfm_accounts" ADD COLUMN IF NOT EXISTS "sync_status" "sync_status" DEFAULT 'idle' NOT NULL;
--> statement-breakpoint
ALTER TABLE "lastfm_accounts" ADD COLUMN IF NOT EXISTS "synced_pages" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "lastfm_accounts" ADD COLUMN IF NOT EXISTS "total_pages" integer;
