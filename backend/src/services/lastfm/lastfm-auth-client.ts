import { signParams } from "./lastfm-signature.js";

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";
const LASTFM_AUTH_PAGE = "https://www.last.fm/api/auth/";

/** Last.fm error codes surfaced during the auth handshake. */
export const LASTFM_ERR_TOKEN_NOT_AUTHORIZED = 14;
export const LASTFM_ERR_INVALID_TOKEN = 4;
export const LASTFM_ERR_TOKEN_EXPIRED = 15;

export class LastfmAuthError extends Error {
  constructor(
    message: string,
    public readonly code: number | null,
  ) {
    super(message);
    this.name = "LastfmAuthError";
  }
}

async function signedGet(
  params: Record<string, string>,
  secret: string,
): Promise<Record<string, unknown>> {
  const signed = { ...params, api_sig: signParams(params, secret) };
  const search = new URLSearchParams({ ...signed, format: "json" });
  const res = await fetch(`${LASTFM_BASE}?${search}`);
  const body = (await res.json().catch(() => ({}))) as {
    error?: number;
    message?: string;
  };
  if (body.error != null) {
    throw new LastfmAuthError(body.message ?? `Last.fm error ${body.error}`, body.error);
  }
  if (!res.ok) {
    throw new LastfmAuthError(`Last.fm HTTP ${res.status}`, null);
  }
  return body as Record<string, unknown>;
}

/** Step 1: request an unauthorized token the user will approve in the browser. */
export async function getAuthToken(apiKey: string, secret: string): Promise<string> {
  const body = await signedGet({ method: "auth.getToken", api_key: apiKey }, secret);
  const token = body.token;
  if (typeof token !== "string" || token.length === 0) {
    throw new LastfmAuthError("Last.fm did not return a token", null);
  }
  return token;
}

/** The page the user visits to authorize the token. */
export function buildAuthUrl(apiKey: string, token: string): string {
  const params = new URLSearchParams({ api_key: apiKey, token });
  return `${LASTFM_AUTH_PAGE}?${params}`;
}

export interface LastfmSession {
  username: string;
  sessionKey: string;
}

/** Step 2: exchange an authorized token for a permanent session key + username. */
export async function getSession(
  apiKey: string,
  secret: string,
  token: string,
): Promise<LastfmSession> {
  const body = await signedGet(
    { method: "auth.getSession", api_key: apiKey, token },
    secret,
  );
  const session = body.session as { name?: string; key?: string } | undefined;
  if (!session?.name || !session.key) {
    throw new LastfmAuthError("Last.fm session response was malformed", null);
  }
  return { username: session.name, sessionKey: session.key };
}
