import type { getDb } from "../../db/index.js";
import { collectionMatches, discogsReleases, scrobbleOutbox } from "../../db/schema.js";

type Db = ReturnType<typeof getDb>;

/** Wipe local data when Plex server or account changes (FR-022). */
export async function wipeLocalData(db: Db): Promise<void> {
  await db.delete(collectionMatches);
  await db.delete(discogsReleases);
  await db.delete(scrobbleOutbox);
}
