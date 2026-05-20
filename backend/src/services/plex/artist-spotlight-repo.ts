import { inArray } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { artistSpotlightState } from "../../db/schema.js";

type Db = ReturnType<typeof getDb>;

export async function selectLeastRecentlyShown(
  db: Db,
  eligibleArtistIds: string[],
  limit: number,
): Promise<string[]> {
  if (eligibleArtistIds.length === 0 || limit <= 0) return [];

  const rows = await db
    .select({
      artistId: artistSpotlightState.artistId,
      lastSpotlightedAt: artistSpotlightState.lastSpotlightedAt,
    })
    .from(artistSpotlightState)
    .where(inArray(artistSpotlightState.artistId, eligibleArtistIds));

  const lastShown = new Map(rows.map((r) => [r.artistId, r.lastSpotlightedAt]));

  return [...eligibleArtistIds]
    .sort((a, b) => {
      const aTime = lastShown.get(a);
      const bTime = lastShown.get(b);
      if (!aTime && !bTime) return a.localeCompare(b);
      if (!aTime) return -1;
      if (!bTime) return 1;
      const diff = aTime.getTime() - bTime.getTime();
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    })
    .slice(0, limit);
}

export async function markShown(db: Db, artistIds: string[], at: Date): Promise<void> {
  if (artistIds.length === 0) return;
  for (const artistId of artistIds) {
    await db
      .insert(artistSpotlightState)
      .values({ artistId, lastSpotlightedAt: at })
      .onConflictDoUpdate({
        target: artistSpotlightState.artistId,
        set: { lastSpotlightedAt: at },
      });
  }
}
