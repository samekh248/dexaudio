import { desc, eq } from "drizzle-orm";
import type {
  PlexConnectionInput,
  PlexConnectionIssue,
  PlexConnectionPublic,
  PlexLibrary,
} from "@dexaudio/shared-types";
import { decrypt, encrypt, maskSecret } from "../../lib/crypto.js";
import { ValidationError } from "../../lib/errors.js";
import type { getDb } from "../../db/index.js";
import { plexConnections } from "../../db/schema.js";
import * as plexClient from "./plex-client.js";
import * as plexTv from "./plex-tv-client.js";

type Db = ReturnType<typeof getDb>;

export type GetPlexConfigOptions = {
  /** When false, skip /identity validation (use for high-frequency timeline posts). Default true. */
  validate?: boolean;
};

let validatedConfigCache: { config: plexClient.PlexConfig; cachedAt: number } | null = null;
const VALIDATED_CONFIG_CACHE_MS = 30_000;

function clearValidatedConfigCache() {
  validatedConfigCache = null;
}

type PlexConnectionRow = typeof plexConnections.$inferSelect;

type ResolvedStoredConnection =
  | { status: "missing" }
  | { status: "decrypt_failed" }
  | { status: "ok"; config: plexClient.PlexConfig; row: PlexConnectionRow; serverReachable: boolean };

async function fetchLatestConnectionRow(db: Db): Promise<PlexConnectionRow | undefined> {
  const rows = await db.select().from(plexConnections).orderBy(desc(plexConnections.updatedAt)).limit(1);
  return rows[0];
}

function toPublic(row: PlexConnectionRow, tokenMasked?: string): PlexConnectionPublic {
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

function loadPlexConfigRow(row: PlexConnectionRow, appSecret: string): plexClient.PlexConfig | null {
  try {
    return {
      serverUrl: row.serverUrl,
      token: decrypt(Buffer.from(row.tokenEncrypted), appSecret),
      machineIdentifier: row.machineIdentifier ?? undefined,
    };
  } catch {
    return null;
  }
}

async function resolveStoredConnection(
  db: Db,
  appSecret: string,
  options: GetPlexConfigOptions = {},
): Promise<ResolvedStoredConnection> {
  const validate = options.validate !== false;
  const row = await fetchLatestConnectionRow(db);
  if (!row) return { status: "missing" };

  let config = loadPlexConfigRow(row, appSecret);
  if (!config) return { status: "decrypt_failed" };

  if (!validate) {
    return { status: "ok", config, row, serverReachable: true };
  }

  const now = Date.now();
  if (
    validatedConfigCache &&
    now - validatedConfigCache.cachedAt < VALIDATED_CONFIG_CACHE_MS &&
    validatedConfigCache.config.serverUrl === config.serverUrl &&
    validatedConfigCache.config.token === config.token
  ) {
    return { status: "ok", config: validatedConfigCache.config, row, serverReachable: true };
  }

  let serverReachable = await plexClient.validateConnection(config);
  if (serverReachable) {
    validatedConfigCache = { config, cachedAt: now };
    return { status: "ok", config, row, serverReachable: true };
  }

  if (row.machineIdentifier) {
    const rediscovered = await tryRediscoverServerUrl(db, appSecret, row);
    if (rediscovered) {
      config = rediscovered;
      serverReachable = await plexClient.validateConnection(config);
      if (serverReachable) {
        validatedConfigCache = { config, cachedAt: now };
      }
      const freshRow = (await fetchLatestConnectionRow(db)) ?? row;
      return { status: "ok", config, row: freshRow, serverReachable };
    }
  }

  return { status: "ok", config, row, serverReachable: false };
}

function issueMessage(issue: PlexConnectionIssue): string {
  switch (issue) {
    case "not_configured":
      return "Sign in with Plex to browse your library.";
    case "decrypt_failed":
      return "Stored Plex credentials could not be read. This usually means APP_SECRET in backend/.env changed. Sign in again without changing APP_SECRET.";
    case "server_unreachable":
      return "Plex credentials are saved but the server did not respond. Ensure Plex is running and reachable, or sign in again.";
    case "reauth_recommended":
      return "Sign in with Plex once more to restore automatic server reconnection.";
    default:
      return "Sign in with Plex.";
  }
}

export async function getConnectionPublic(db: Db, appSecret: string): Promise<PlexConnectionPublic> {
  const resolved = await resolveStoredConnection(db, appSecret, { validate: true });

  if (resolved.status === "missing") {
    return { connected: false, issue: "not_configured", issueMessage: issueMessage("not_configured") };
  }

  if (resolved.status === "decrypt_failed") {
    return { connected: false, issue: "decrypt_failed", issueMessage: issueMessage("decrypt_failed") };
  }

  let tokenMasked: string | undefined;
  try {
    tokenMasked = maskSecret(decrypt(Buffer.from(resolved.row.tokenEncrypted), appSecret));
  } catch {
    return { connected: false, issue: "decrypt_failed", issueMessage: issueMessage("decrypt_failed") };
  }

  const base = toPublic(resolved.row, tokenMasked);

  if (!resolved.serverReachable) {
    const issue: PlexConnectionIssue = resolved.row.accountTokenEncrypted
      ? "server_unreachable"
      : "reauth_recommended";
    return {
      ...base,
      connected: true,
      issue,
      issueMessage: issueMessage(issue),
    };
  }

  return base;
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

  clearValidatedConfigCache();
  return getConnectionPublic(db, appSecret);
}

export async function getPlexConfig(
  db: Db,
  appSecret: string,
  options: GetPlexConfigOptions = {},
): Promise<plexClient.PlexConfig | null> {
  const resolved = await resolveStoredConnection(db, appSecret, options);
  if (resolved.status === "missing" || resolved.status === "decrypt_failed") {
    return null;
  }
  return resolved.config;
}

async function tryRediscoverServerUrl(
  db: Db,
  appSecret: string,
  row: PlexConnectionRow,
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

    clearValidatedConfigCache();
    return {
      serverUrl: conn.uri,
      token: server.accessToken,
      machineIdentifier: row.machineIdentifier ?? undefined,
    };
  } catch {
    return null;
  }
}

/** @internal test helper */
export function resetPlexConfigCacheForTests(): void {
  clearValidatedConfigCache();
}

export async function listLibraries(db: Db, appSecret: string): Promise<PlexLibrary[]> {
  const config = await getPlexConfig(db, appSecret);
  if (!config) return [];
  return plexClient.fetchLibraries(config);
}
