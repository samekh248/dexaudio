import type { LastfmAuthStatus, LastfmAuthToken } from "@dexaudio/shared-types";
import { eq } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { lastfmAccounts } from "../../db/schema.js";
import { encrypt } from "../../lib/crypto.js";
import { ValidationError } from "../../lib/errors.js";
import * as authClient from "./lastfm-auth-client.js";
import * as syncService from "./lastfm-sync-service.js";

type Db = ReturnType<typeof getDb>;

interface LastfmCredentials {
  apiKey: string;
  apiSecret: string;
}

interface TokenSession {
  token: string;
  createdAt: number;
}

const TOKEN_TTL_MS = 15 * 60 * 1000;
const tokenSessions = new Map<string, TokenSession>();

function pruneExpiredTokens(): void {
  const now = Date.now();
  for (const [token, session] of tokenSessions) {
    if (now - session.createdAt > TOKEN_TTL_MS) tokenSessions.delete(token);
  }
}

function requireCredentials(
  apiKey: string | undefined,
  apiSecret: string | undefined,
): LastfmCredentials {
  if (!apiKey || !apiSecret) {
    throw new ValidationError(
      "Last.fm API key and secret are not configured",
      "Set LASTFM_API_KEY and LASTFM_API_SECRET on the server",
    );
  }
  return { apiKey, apiSecret };
}

export async function startAuth(
  apiKey: string | undefined,
  apiSecret: string | undefined,
): Promise<LastfmAuthToken> {
  const creds = requireCredentials(apiKey, apiSecret);
  pruneExpiredTokens();
  const token = await authClient.getAuthToken(creds.apiKey, creds.apiSecret);
  tokenSessions.set(token, { token, createdAt: Date.now() });
  return { token, authUrl: authClient.buildAuthUrl(creds.apiKey, token) };
}

export async function pollAuth(
  db: Db,
  appSecret: string,
  apiKey: string | undefined,
  apiSecret: string | undefined,
  token: string,
): Promise<LastfmAuthStatus> {
  const creds = requireCredentials(apiKey, apiSecret);
  pruneExpiredTokens();

  const session = tokenSessions.get(token);
  if (!session) {
    return { authorized: false, expired: true };
  }

  try {
    const result = await authClient.getSession(creds.apiKey, creds.apiSecret, token);
    tokenSessions.delete(token);
    const username = await persistSession(db, appSecret, result.username, result.sessionKey);
    const accountId = await accountIdFor(db);
    if (accountId) {
      syncService.triggerBackfill(db, creds.apiKey, accountId, username);
    }
    return { authorized: true, expired: false, username };
  } catch (err) {
    if (err instanceof authClient.LastfmAuthError) {
      if (err.code === authClient.LASTFM_ERR_TOKEN_NOT_AUTHORIZED) {
        return { authorized: false, expired: false };
      }
      if (
        err.code === authClient.LASTFM_ERR_INVALID_TOKEN ||
        err.code === authClient.LASTFM_ERR_TOKEN_EXPIRED
      ) {
        tokenSessions.delete(token);
        return { authorized: false, expired: true };
      }
    }
    throw err;
  }
}

async function persistSession(
  db: Db,
  appSecret: string,
  username: string,
  sessionKey: string,
): Promise<string> {
  const encrypted = encrypt(sessionKey, appSecret);
  const existing = await db.select().from(lastfmAccounts).limit(1);
  const usernameChanged = existing[0]?.username !== username;

  if (existing[0]) {
    await db
      .update(lastfmAccounts)
      .set({
        sessionKeyEncrypted: encrypted,
        username,
        connected: true,
        lastError: null,
        // Reset the sync cursor when a different account connects.
        ...(usernameChanged ? { lastSyncedAt: null, syncedPages: 0, totalPages: null } : {}),
      })
      .where(eq(lastfmAccounts.id, existing[0].id));
  } else {
    await db.insert(lastfmAccounts).values({
      sessionKeyEncrypted: encrypted,
      username,
      connected: true,
    });
  }
  return username;
}

async function accountIdFor(db: Db): Promise<string | null> {
  const rows = await db.select({ id: lastfmAccounts.id }).from(lastfmAccounts).limit(1);
  return rows[0]?.id ?? null;
}

/** @internal test helper */
export function resetAuthStateForTests(): void {
  tokenSessions.clear();
}
