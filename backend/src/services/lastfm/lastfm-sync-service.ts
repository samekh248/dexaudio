import { eq } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { lastfmAccounts, scrobbles } from "../../db/schema.js";
import * as readClient from "./lastfm-read-client.js";

type Db = ReturnType<typeof getDb>;

/** Abort a sync that has made no progress within this window. */
export const SYNC_STALE_MS = 10 * 60 * 1000;

export async function getAccount(db: Db) {
  const rows = await db.select().from(lastfmAccounts).limit(1);
  return rows[0] ?? null;
}

async function insertTracks(db: Db, tracks: readClient.LastfmRecentTrack[]) {
  if (tracks.length === 0) return;
  await db
    .insert(scrobbles)
    .values(
      tracks.map((t) => ({
        playedAt: t.playedAt,
        track: t.track,
        artist: t.artist,
        album: t.album,
        artistMbid: t.artistMbid,
        albumMbid: t.albumMbid,
        imageUrl: t.imageUrl,
        source: "lastfm" as const,
      })),
    )
    .onConflictDoNothing();
}

function newestPlayedAt(
  tracks: readClient.LastfmRecentTrack[],
  current: Date | null = null,
): Date | null {
  return tracks.reduce<Date | null>((max, t) => {
    if (!max || t.playedAt > max) return t.playedAt;
    return max;
  }, current);
}

async function fetchAndInsertPages(
  db: Db,
  apiKey: string,
  username: string,
  opts: {
    from?: number;
    startPage?: number;
    onPage: (page: number, totalPages: number) => Promise<void>;
  },
): Promise<Date | null> {
  let page = opts.startPage ?? 1;
  let totalPages = 1;
  let newest: Date | null = null;

  do {
    const result = await readClient.getRecentTracksPage(apiKey, username, page, {
      from: opts.from,
    });
    await insertTracks(db, result.tracks);
    newest = newestPlayedAt(result.tracks, newest);
    totalPages = result.totalPages;
    await opts.onPage(page, totalPages);
    if (page >= totalPages) break;
    page += 1;
    await readClient.sleep(readClient.PAGE_DELAY_MS);
  } while (page <= totalPages);

  return newest;
}

async function markSyncError(db: Db, accountId: string, message: string) {
  await db
    .update(lastfmAccounts)
    .set({ syncStatus: "error", lastError: message, syncStartedAt: null })
    .where(eq(lastfmAccounts.id, accountId));
}

export async function recoverStaleSync(db: Db): Promise<boolean> {
  const account = await getAccount(db);
  if (!account?.connected || account.syncStatus !== "syncing") return false;

  const startedAt = account.syncStartedAt;
  const stale =
    startedAt == null || Date.now() - startedAt.getTime() >= SYNC_STALE_MS;
  if (!stale) return false;

  await markSyncError(
    db,
    account.id,
    "Sync timed out. It will retry automatically.",
  );
  return true;
}

/** Clears orphaned syncing state after a server restart and resumes sync. */
export async function recoverInterruptedSync(
  db: Db,
  apiKey: string | undefined,
): Promise<void> {
  const account = await getAccount(db);
  if (!account?.connected || !account.username || account.syncStatus !== "syncing") {
    return;
  }

  await db
    .update(lastfmAccounts)
    .set({ syncStatus: "idle", syncStartedAt: null, lastError: null })
    .where(eq(lastfmAccounts.id, account.id));

  if (!apiKey) return;

  const incompleteBackfill =
    account.totalPages != null &&
    account.totalPages > 0 &&
    account.syncedPages < account.totalPages;

  if (incompleteBackfill) {
    triggerBackfill(db, apiKey, account.id, account.username);
    return;
  }

  void runIncrementalSync(
    db,
    apiKey,
    account.id,
    account.username,
    account.lastSyncedAt,
  ).catch(() => undefined);
}

export async function runFullBackfill(db: Db, apiKey: string, accountId: string, username: string) {
  const existing = await db
    .select()
    .from(lastfmAccounts)
    .where(eq(lastfmAccounts.id, accountId))
    .limit(1);
  const resumePage =
    existing[0]?.syncStatus === "error" && existing[0].syncedPages > 0
      ? existing[0].syncedPages + 1
      : 1;

  await db
    .update(lastfmAccounts)
    .set({
      syncStatus: "syncing",
      syncedPages: resumePage > 1 ? resumePage - 1 : 0,
      syncStartedAt: new Date(),
      lastError: null,
    })
    .where(eq(lastfmAccounts.id, accountId));

  try {
    const playcount = await readClient.getUserPlaycount(apiKey, username);
    let totalPages = 1;

    const newest = await fetchAndInsertPages(db, apiKey, username, {
      startPage: resumePage,
      onPage: async (page, total) => {
        totalPages = total;
        await db
          .update(lastfmAccounts)
          .set({
            syncedPages: page,
            totalPages: total,
            totalScrobbles: playcount,
            syncStartedAt: new Date(),
          })
          .where(eq(lastfmAccounts.id, accountId));
      },
    });

    await db
      .update(lastfmAccounts)
      .set({
        syncStatus: "idle",
        syncedPages: totalPages,
        totalPages,
        totalScrobbles: playcount,
        lastSyncedAt: newest ?? new Date(),
        syncStartedAt: null,
        lastError: null,
      })
      .where(eq(lastfmAccounts.id, accountId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await markSyncError(db, accountId, message);
    throw err;
  }
}

export async function runIncrementalSync(
  db: Db,
  apiKey: string,
  accountId: string,
  username: string,
  lastSyncedAt: Date | null,
) {
  const acc = await db.select().from(lastfmAccounts).where(eq(lastfmAccounts.id, accountId)).limit(1);
  if (!acc[0]?.connected || acc[0].syncStatus === "syncing") return;

  await db
    .update(lastfmAccounts)
    .set({ syncStatus: "syncing", syncStartedAt: new Date(), lastError: null })
    .where(eq(lastfmAccounts.id, accountId));

  try {
    const from = lastSyncedAt ? Math.floor(lastSyncedAt.getTime() / 1000) : undefined;
    const newest = await fetchAndInsertPages(db, apiKey, username, {
      from,
      onPage: async (page, total) => {
        await db
          .update(lastfmAccounts)
          .set({
            syncedPages: page,
            totalPages: total,
            syncStartedAt: new Date(),
          })
          .where(eq(lastfmAccounts.id, accountId));
      },
    });

    await db
      .update(lastfmAccounts)
      .set({
        syncStatus: "idle",
        lastSyncedAt: newest ?? lastSyncedAt ?? new Date(),
        syncStartedAt: null,
        lastError: null,
      })
      .where(eq(lastfmAccounts.id, accountId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await markSyncError(db, accountId, message);
  }
}

export function triggerBackfill(
  db: Db,
  apiKey: string | undefined,
  accountId: string,
  username: string,
) {
  if (!apiKey) return;
  void runFullBackfill(db, apiKey, accountId, username).catch(() => undefined);
}
