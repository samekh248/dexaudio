import { and, eq, lt } from "drizzle-orm";
import type { ScrobbleInput } from "@dexaudio/shared-types";
import type { getDb } from "../../db/index.js";
import { lastfmAccounts, scrobbleOutbox } from "../../db/schema.js";
import { decrypt } from "../../lib/crypto.js";
import { submitScrobble } from "./lastfm-client.js";

type Db = ReturnType<typeof getDb>;

interface FlushCredentials {
  apiKey?: string;
  apiSecret?: string;
  appSecret: string;
}

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
    .where(
      and(eq(scrobbleOutbox.status, "pending"), lt(scrobbleOutbox.expiresAt, new Date())),
    );
}

/**
 * Submits pending scrobbles to Last.fm. No-ops gracefully when Last.fm
 * credentials are missing or no account is connected, leaving rows pending.
 */
export async function flushPending(
  db: Db,
  creds: FlushCredentials,
): Promise<{ delivered: number; pending: number }> {
  await dropExpired(db);

  if (!creds.apiKey || !creds.apiSecret) {
    return { delivered: 0, pending: await getPendingCount(db) };
  }

  const accounts = await db.select().from(lastfmAccounts).limit(1);
  const account = accounts[0];
  if (!account?.connected || !account.sessionKeyEncrypted) {
    return { delivered: 0, pending: await getPendingCount(db) };
  }

  let sessionKey: string;
  try {
    sessionKey = decrypt(account.sessionKeyEncrypted, creds.appSecret);
  } catch {
    return { delivered: 0, pending: await getPendingCount(db) };
  }

  const rows = await db
    .select()
    .from(scrobbleOutbox)
    .where(eq(scrobbleOutbox.status, "pending"))
    .orderBy(scrobbleOutbox.playedAt);

  let delivered = 0;
  for (const row of rows) {
    const scrobble: ScrobbleInput = {
      track: row.trackTitle,
      artist: row.artist,
      album: row.album,
      playedAt: row.playedAt.toISOString(),
    };
    const ok = await submitScrobble(creds.apiKey, creds.apiSecret, sessionKey, scrobble);
    if (ok) {
      await db
        .update(scrobbleOutbox)
        .set({ status: "submitted" })
        .where(eq(scrobbleOutbox.id, row.id));
      delivered += 1;
    } else {
      await db
        .update(scrobbleOutbox)
        .set({ retryCount: row.retryCount + 1 })
        .where(eq(scrobbleOutbox.id, row.id));
    }
  }

  return { delivered, pending: await getPendingCount(db) };
}
