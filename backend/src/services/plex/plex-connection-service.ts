import { desc, eq } from "drizzle-orm";
import type { PlexConnectionInput, PlexConnectionPublic, PlexLibrary } from "@dexaudio/shared-types";
import { decrypt, encrypt, maskSecret } from "../../lib/crypto.js";
import { ValidationError } from "../../lib/errors.js";
import type { getDb } from "../../db/index.js";
import { plexConnections } from "../../db/schema.js";
import * as plexClient from "./plex-client.js";
import * as plexTv from "./plex-tv-client.js";

type Db = ReturnType<typeof getDb>;

function toPublic(row: typeof plexConnections.$inferSelect, tokenMasked?: string): PlexConnectionPublic {
  return {
    connected: true,
    serverUrl: row.serverUrl,
    serverName: row.serverName ?? undefined,
    machineIdentifier: row.machineIdentifier ?? undefined,
    tokenMasked,
    libraryIds: row.activeLibraryIds ?? [],
    account: row.accountUsername
      ? {
          username: row.accountUsername,
          avatarUrl: row.accountAvatarUrl ?? null,
          email: row.accountEmail ?? null,
        }
      : undefined,
  };
}

export async function getConnectionPublic(db: Db, appSecret: string): Promise<PlexConnectionPublic> {
  const rows = await db.select().from(plexConnections).orderBy(desc(plexConnections.updatedAt)).limit(1);
  const row = rows[0];
  if (!row) return { connected: false };
  try {
    return toPublic(row, maskSecret(decrypt(Buffer.from(row.tokenEncrypted), appSecret)));
  } catch {
    // Stale or corrupted ciphertext — treat as disconnected.
    return { connected: false };
  }
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

  const config: plexClient.PlexConfig = {
    serverUrl: row.serverUrl,
    token: decrypt(Buffer.from(row.tokenEncrypted), appSecret),
    machineIdentifier: row.machineIdentifier ?? undefined,
  };

  const valid = await plexClient.validateConnection(config);
  if (valid) return config;

  if (!row.machineIdentifier) return config;

  const rediscovered = await tryRediscoverServerUrl(db, appSecret, row);
  return rediscovered ?? config;
}

async function tryRediscoverServerUrl(
  db: Db,
  appSecret: string,
  row: typeof plexConnections.$inferSelect,
): Promise<plexClient.PlexConfig | null> {
  try {
    if (!row.accountTokenEncrypted) return null;
    const accountToken = decrypt(Buffer.from(row.accountTokenEncrypted), appSecret);
    const resources = await plexTv.fetchResources(accountToken);
    const server = resources.find(
      (r) => r.clientIdentifier === row.machineIdentifier && plexTv.isServerResource(r),
    );
    if (!server?.accessToken) return null;
    const conn = plexTv.selectBestConnection(server.connections);
    if (!conn) return null;

    const serverConfig = { serverUrl: conn.uri, token: server.accessToken };
    const valid = await plexClient.validateConnection(serverConfig);
    if (!valid) return null;

    await db
      .update(plexConnections)
      .set({
        serverUrl: conn.uri,
        tokenEncrypted: encrypt(server.accessToken, appSecret),
        lastValidatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plexConnections.id, row.id));

    return {
      serverUrl: conn.uri,
      token: server.accessToken,
      machineIdentifier: row.machineIdentifier ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function listLibraries(db: Db, appSecret: string): Promise<PlexLibrary[]> {
  const config = await getPlexConfig(db, appSecret);
  if (!config) return [];
  return plexClient.fetchLibraries(config);
}
