import { desc, eq } from "drizzle-orm";
import type { PlexConnectionInput, PlexConnectionPublic, PlexLibrary } from "@dexaudio/shared-types";
import { decrypt, encrypt, maskSecret } from "../../lib/crypto.js";
import { ValidationError } from "../../lib/errors.js";
import type { getDb } from "../../db/index.js";
import { plexConnections } from "../../db/schema.js";
import * as plexClient from "./plex-client.js";

type Db = ReturnType<typeof getDb>;

export async function getConnectionPublic(db: Db, appSecret: string): Promise<PlexConnectionPublic> {
  const rows = await db.select().from(plexConnections).orderBy(desc(plexConnections.updatedAt)).limit(1);
  const row = rows[0];
  if (!row) return { connected: false };
  return {
    serverUrl: row.serverUrl,
    tokenMasked: maskSecret(decrypt(Buffer.from(row.tokenEncrypted), appSecret)),
    libraryIds: row.activeLibraryIds ?? [],
    connected: true,
  };
}

export async function saveConnection(
  db: Db,
  appSecret: string,
  input: PlexConnectionInput,
): Promise<PlexConnectionPublic> {
  const valid = await plexClient.validateConnection({
    serverUrl: input.serverUrl,
    token: input.token,
  });
  if (!valid) {
    throw new ValidationError("Plex server unreachable or token invalid", "Verify URL and token");
  }

  const libraryIds = input.libraryIds ?? [];
  const encrypted = encrypt(input.token, appSecret);
  const existing = await db.select().from(plexConnections).limit(1);

  if (existing[0]) {
    await db
      .update(plexConnections)
      .set({
        serverUrl: input.serverUrl,
        tokenEncrypted: encrypted,
        activeLibraryIds: libraryIds,
        lastValidatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plexConnections.id, existing[0].id));
  } else {
    await db.insert(plexConnections).values({
      serverUrl: input.serverUrl,
      tokenEncrypted: encrypted,
      activeLibraryIds: libraryIds,
      lastValidatedAt: new Date(),
    });
  }

  return getConnectionPublic(db, appSecret);
}

export async function getPlexConfig(db: Db, appSecret: string): Promise<plexClient.PlexConfig | null> {
  const rows = await db.select().from(plexConnections).orderBy(desc(plexConnections.updatedAt)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    serverUrl: row.serverUrl,
    token: decrypt(Buffer.from(row.tokenEncrypted), appSecret),
  };
}

export async function listLibraries(db: Db, appSecret: string): Promise<PlexLibrary[]> {
  const config = await getPlexConfig(db, appSecret);
  if (!config) return [];
  return plexClient.fetchLibraries(config);
}
