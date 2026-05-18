import { and, eq, lt } from "drizzle-orm";
import type { ScrobbleInput } from "@dexaudio/shared-types";
import type { getDb } from "../../db/index.js";
import { scrobbleOutbox } from "../../db/schema.js";

type Db = ReturnType<typeof getDb>;

export async function enqueueScrobble(db: Db, scrobble: ScrobbleInput) {
  const playedAt = new Date(scrobble.playedAt);
  const expiresAt = new Date(playedAt.getTime() + 24 * 60 * 60 * 1000);

  const existing = await db
    .select({ id: scrobbleOutbox.id })
    .from(scrobbleOutbox)
    .where(
      and(
        eq(scrobbleOutbox.trackTitle, scrobble.track),
        eq(scrobbleOutbox.artist, scrobble.artist),
        eq(scrobbleOutbox.album, scrobble.album),
        eq(scrobbleOutbox.playedAt, playedAt),
        eq(scrobbleOutbox.status, "pending"),
      ),
    )
    .limit(1);

  if (existing[0]) return;

  await db.insert(scrobbleOutbox).values({
    trackTitle: scrobble.track,
    artist: scrobble.artist,
    album: scrobble.album,
    playedAt,
    expiresAt,
    status: "pending",
  });
}

export async function getPendingCount(db: Db): Promise<number> {
  const rows = await db.select().from(scrobbleOutbox).where(eq(scrobbleOutbox.status, "pending"));
  return rows.length;
}

export async function dropExpired(db: Db) {
  await db
    .update(scrobbleOutbox)
    .set({ status: "dropped" })
    .where(lt(scrobbleOutbox.expiresAt, new Date()));
}
