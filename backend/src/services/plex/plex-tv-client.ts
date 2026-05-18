import { PLEX_CLIENT_ID, PLEX_PRODUCT_NAME } from "../../lib/config.js";
import { BadGatewayError } from "../../lib/errors.js";

const PLEX_TV_BASE = "https://plex.tv";

export interface PlexPinResponse {
  id: number;
  code: string;
  expiresAt: string;
  authToken?: string | null;
}

export interface PlexUserResponse {
  uuid: string;
  username: string;
  email?: string;
  thumb?: string;
}

export interface PlexConnection {
  protocol: string;
  address: string;
  port: number;
  uri: string;
  local: boolean;
  relay: boolean;
  IPv6?: boolean;
}

export interface PlexResource {
  name: string;
  clientIdentifier: string;
  owned: boolean;
  presence: boolean;
  provides: string;
  accessToken?: string;
  sourceTitle?: string;
  connections: PlexConnection[];
}

function plexHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Plex-Client-Identifier": PLEX_CLIENT_ID,
    "X-Plex-Product": PLEX_PRODUCT_NAME,
  };
  if (token) headers["X-Plex-Token"] = token;
  return headers;
}

async function plexTvFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${PLEX_TV_BASE}${path}`, init);
  } catch {
    throw new BadGatewayError(
      "Plex authentication service is unavailable",
      "Try again in a few moments",
    );
  }
  if (!res.ok) {
    throw new BadGatewayError(
      "Plex authentication service returned an error",
      "Try again in a few moments",
    );
  }
  return res.json() as Promise<T>;
}

export function buildAuthUrl(pinCode: string): string {
  const product = encodeURIComponent(PLEX_PRODUCT_NAME);
  return `https://app.plex.tv/auth#?clientID=${encodeURIComponent(PLEX_CLIENT_ID)}&code=${encodeURIComponent(pinCode)}&context[device][product]=${product}`;
}

export async function createPin(): Promise<PlexPinResponse> {
  return plexTvFetch<PlexPinResponse>("/api/v2/pins", {
    method: "POST",
    headers: { ...plexHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ strong: true }),
  });
}

export async function getPin(pinId: number): Promise<PlexPinResponse> {
  return plexTvFetch<PlexPinResponse>(`/api/v2/pins/${pinId}`, {
    headers: plexHeaders(),
  });
}

export async function fetchUser(token: string): Promise<PlexUserResponse> {
  return plexTvFetch<PlexUserResponse>("/api/v2/user", {
    headers: plexHeaders(token),
  });
}

export async function fetchResources(token: string): Promise<PlexResource[]> {
  const url = "/api/v2/resources?includeHttps=1&includeRelay=1";
  return plexTvFetch<PlexResource[]>(url, { headers: plexHeaders(token) });
}

/** Prefer local direct connections, then remote, then relay. */
export function selectBestConnection(connections: PlexConnection[]): PlexConnection | null {
  const ordered = orderConnections(connections);
  return ordered[0] ?? null;
}

/** Connections in preferred-attempt order: local → remote https → remote http → relay. */
export function orderConnections(connections: PlexConnection[]): PlexConnection[] {
  const score = (c: PlexConnection) => {
    if (c.relay) return 0;
    if (c.local) return 3;
    return c.protocol === "https" ? 2 : 1;
  };
  return [...connections].sort((a, b) => score(b) - score(a));
}

/**
 * Probe connections in preferred order and return the first one that responds to /identity
 * within the timeout. Returns null if all fail.
 */
export async function findReachableConnection(
  connections: PlexConnection[],
  token: string,
  timeoutMs = 3500,
): Promise<PlexConnection | null> {
  for (const conn of orderConnections(connections)) {
    if (await probeIdentity(conn.uri, token, timeoutMs)) return conn;
  }
  return null;
}

async function probeIdentity(uri: string, token: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${uri.replace(/\/$/, "")}/identity?X-Plex-Token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function isServerResource(resource: PlexResource): boolean {
  return resource.provides.split(",").map((p) => p.trim()).includes("server");
}
