import { sql } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import {
  appSettings,
  collectionMatches,
  discogsAccounts,
  discogsReleases,
  lastfmAccounts,
  plexConnections,
  scrobbleOutbox,
} from "../../db/schema.js";

type Db = ReturnType<typeof getDb>;

export type ResetTarget = "plex" | "discogs" | "lastfm" | "collection" | "cache" | "scrobbles" | "all";

export async function resetTargets(db: Db, targets: ResetTarget[]) {
  const all = targets.includes("all");
  if (all || targets.includes("plex")) await db.delete(plexConnections);
  if (all || targets.includes("discogs")) {
    await db.delete(discogsAccounts);
    await db.delete(discogsReleases);
    await db.delete(collectionMatches);
  }
  if (all || targets.includes("lastfm")) await db.delete(lastfmAccounts);
  if (all || targets.includes("collection")) {
    await db.delete(collectionMatches);
    await db.delete(discogsReleases);
  }
  if (all || targets.includes("scrobbles")) await db.delete(scrobbleOutbox);
  if (all || targets.includes("cache")) {
    await db.delete(appSettings).where(sql`key LIKE 'cache.%'`);
  }
}
