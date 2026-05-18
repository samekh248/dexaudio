import { eq } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { collectionMatches, discogsAccounts, discogsReleases } from "../../db/schema.js";
import { decrypt, encrypt } from "../../lib/crypto.js";
import type { Album } from "@dexaudio/shared-types";
import * as discogsClient from "./discogs-client.js";
import { matchRelease } from "./matcher.js";

type Db = ReturnType<typeof getDb>;

export async function saveDiscogsConnection(
  db: Db,
  appSecret: string,
  username: string,
  token: string,
) {
  const encrypted = encrypt(token, appSecret);
  const existing = await db.select().from(discogsAccounts).limit(1);
  if (existing[0]) {
    await db
      .update(discogsAccounts)
      .set({ username, tokenEncrypted: encrypted })
      .where(eq(discogsAccounts.id, existing[0].id));
  } else {
    await db.insert(discogsAccounts).values({ username, tokenEncrypted: encrypted });
  }
}

export async function getDiscogsConfig(db: Db, appSecret: string): Promise<discogsClient.DiscogsConfig | null> {
  const rows = await db.select().from(discogsAccounts).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    username: row.username,
    token: decrypt(Buffer.from(row.tokenEncrypted), appSecret),
  };
}

export async function syncCollection(
  db: Db,
  appSecret: string,
  plexAlbums: Album[],
  strictness: "strict" | "fuzzy",
) {
  const config = await getDiscogsConfig(db, appSecret);
  if (!config) throw new Error("Discogs not connected");

  const releases = await discogsClient.fetchCollection(config);

  for (const release of releases) {
    await db
      .insert(discogsReleases)
      .values({
        discogsReleaseId: release.id,
        title: release.title,
        artist: release.artist,
        year: release.year,
        format: release.format,
      })
      .onConflictDoUpdate({
        target: discogsReleases.discogsReleaseId,
        set: {
          title: release.title,
          artist: release.artist,
          year: release.year,
          format: release.format,
          syncedAt: new Date(),
        },
      });

    const existingMatch = await db
      .select()
      .from(collectionMatches)
      .where(eq(collectionMatches.discogsReleaseId, release.id))
      .limit(1);
    if (existingMatch[0]?.manualOverride) continue;

    const match = matchRelease(release, plexAlbums, strictness);
    await db
      .insert(collectionMatches)
      .values({
        discogsReleaseId: release.id,
        plexRatingKey: match.plexRatingKey,
        status: match.status,
        confidence: String(match.confidence),
        matchCandidates: match.candidates,
        manualOverride: false,
      })
      .onConflictDoUpdate({
        target: collectionMatches.discogsReleaseId,
        set: {
          plexRatingKey: match.plexRatingKey,
          status: match.status,
          confidence: String(match.confidence),
          matchCandidates: match.candidates,
          manualOverride: false,
          matchedAt: new Date(),
        },
      });
  }

  await db
    .update(discogsAccounts)
    .set({ lastSyncAt: new Date() })
    .where(eq(discogsAccounts.username, config.username));
}
