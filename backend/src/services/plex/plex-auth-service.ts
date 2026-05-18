import type {
  PlexAuthCompleteInput,
  PlexAuthCompleteResult,
  PlexPinCreated,
  PlexPinStatus,
  PlexServerInfo,
} from "@dexaudio/shared-types";
import { eq } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { plexConnections } from "../../db/schema.js";
import { encrypt } from "../../lib/crypto.js";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors.js";
import * as plexTv from "./plex-tv-client.js";
import { wipeLocalData } from "./data-wipe-service.js";
import * as connectionService from "./plex-connection-service.js";

type Db = ReturnType<typeof getDb>;

interface PinSession {
  pinId: number;
  pinCode: string;
  createdAt: number;
}

interface PendingAuth {
  accountToken: string;
  accountId: string;
  accountUsername: string;
  accountAvatarUrl: string | null;
  accountEmail: string | null;
  expiresAt: number;
}

const PIN_TTL_MS = 30 * 60 * 1000;
const PENDING_AUTH_TTL_MS = 15 * 60 * 1000;

const pinSessions = new Map<number, PinSession>();
let pendingAuth: PendingAuth | null = null;

function pruneExpiredPins(): void {
  const now = Date.now();
  for (const [id, session] of pinSessions) {
    if (now - session.createdAt > PIN_TTL_MS) pinSessions.delete(id);
  }
}

function requirePendingAuth(): PendingAuth {
  if (!pendingAuth || pendingAuth.expiresAt < Date.now()) {
    pendingAuth = null;
    throw new UnauthorizedError("Complete Plex sign-in before continuing", "Sign in with Plex first");
  }
  return pendingAuth;
}

export async function createPin(): Promise<PlexPinCreated> {
  pruneExpiredPins();
  const pin = await plexTv.createPin();
  pinSessions.set(pin.id, { pinId: pin.id, pinCode: pin.code, createdAt: Date.now() });
  return {
    pinId: pin.id,
    pinCode: pin.code,
    authUrl: plexTv.buildAuthUrl(pin.code),
  };
}

export async function getPinStatus(pinId: number): Promise<PlexPinStatus> {
  pruneExpiredPins();
  const session = pinSessions.get(pinId);
  if (!session) {
    return { authorized: false, expired: true };
  }
  if (Date.now() - session.createdAt > PIN_TTL_MS) {
    pinSessions.delete(pinId);
    return { authorized: false, expired: true };
  }

  const pin = await plexTv.getPin(pinId);
  if (!pin.authToken) {
    return { authorized: false, expired: false };
  }

  const user = await plexTv.fetchUser(pin.authToken);
  pendingAuth = {
    accountToken: pin.authToken,
    accountId: user.uuid,
    accountUsername: user.username,
    accountAvatarUrl: user.thumb ?? null,
    accountEmail: user.email ?? null,
    expiresAt: Date.now() + PENDING_AUTH_TTL_MS,
  };
  pinSessions.delete(pinId);

  return { authorized: true, expired: false };
}

export async function listServers(): Promise<PlexServerInfo[]> {
  const auth = requirePendingAuth();
  const resources = await plexTv.fetchResources(auth.accountToken);
  return resources
    .filter(plexTv.isServerResource)
    .map((r) => ({
      machineIdentifier: r.clientIdentifier,
      name: r.name,
      owned: r.owned,
      online: r.presence,
      sourceTitle: r.sourceTitle ?? null,
    }));
}

export async function listServerLibraries(machineId: string) {
  const auth = requirePendingAuth();
  const resources = await plexTv.fetchResources(auth.accountToken);
  const server = resources.find((r) => r.clientIdentifier === machineId && plexTv.isServerResource(r));
  if (!server?.accessToken) {
    throw new NotFoundError("Server not found or offline");
  }
  const conn = await plexTv.findReachableConnection(server.connections, server.accessToken);
  if (!conn) {
    throw new NotFoundError("Server has no reachable connection");
  }
  const { fetchLibraries } = await import("./plex-client.js");
  return fetchLibraries({ serverUrl: conn.uri, token: server.accessToken });
}

export async function completeAuth(
  db: Db,
  appSecret: string,
  input: PlexAuthCompleteInput,
): Promise<PlexAuthCompleteResult> {
  const auth = requirePendingAuth();
  const resources = await plexTv.fetchResources(auth.accountToken);
  const server = resources.find(
    (r) => r.clientIdentifier === input.machineIdentifier && plexTv.isServerResource(r),
  );
  if (!server?.accessToken) {
    throw new ValidationError("Selected server is not available", "Choose another server");
  }
  const conn = await plexTv.findReachableConnection(server.connections, server.accessToken);
  if (!conn) {
    throw new ValidationError("Selected server is not reachable", "Choose another server or check the network");
  }

  const existing = await db.select().from(plexConnections).limit(1);
  const prev = existing[0];
  const accountChanged = prev?.accountId != null && prev.accountId !== auth.accountId;
  const serverChanged =
    prev?.machineIdentifier != null && prev.machineIdentifier !== input.machineIdentifier;
  const dataWiped = Boolean(prev && (accountChanged || serverChanged));

  if (dataWiped) {
    await wipeLocalData(db);
  }

  const encrypted = encrypt(server.accessToken, appSecret);
  const accountTokenEncrypted = encrypt(auth.accountToken, appSecret);
  const row = {
    serverUrl: conn.uri,
    tokenEncrypted: encrypted,
    accountTokenEncrypted,
    activeLibraryIds: input.libraryIds,
    machineIdentifier: server.clientIdentifier,
    serverName: server.name,
    accountId: auth.accountId,
    accountUsername: auth.accountUsername,
    accountAvatarUrl: auth.accountAvatarUrl,
    accountEmail: auth.accountEmail,
    lastValidatedAt: new Date(),
    updatedAt: new Date(),
  };

  if (prev) {
    await db.update(plexConnections).set(row).where(eq(plexConnections.id, prev.id));
  } else {
    await db.insert(plexConnections).values(row);
  }

  pendingAuth = null;

  const connection = await connectionService.getConnectionPublic(db, appSecret);
  return { connection, dataWiped };
}

export async function getAccountIdentity(db: Db): Promise<{
  username: string;
  avatarUrl: string | null;
  email: string | null;
}> {
  const rows = await db.select().from(plexConnections).limit(1);
  const row = rows[0];
  if (!row?.accountUsername) {
    throw new NotFoundError("No Plex account configured");
  }
  return {
    username: row.accountUsername,
    avatarUrl: row.accountAvatarUrl ?? null,
    email: row.accountEmail ?? null,
  };
}

/** @internal test helper */
export function resetAuthStateForTests(): void {
  pinSessions.clear();
  pendingAuth = null;
}
