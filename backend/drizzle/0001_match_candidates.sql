ALTER TABLE "collection_matches" ADD COLUMN IF NOT EXISTS "match_candidates" jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS "collection_matches_discogs_release_id_unique" ON "collection_matches" ("discogs_release_id");
