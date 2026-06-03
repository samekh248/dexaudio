import type { PlexConfig } from "./plex-client.js";
import { plexMediaHeaders } from "./plex-client.js";

export type PlayerCommandTarget = {
  requestBase: string;
  token: string;
  targetClientId: string;
  mode: "direct" | "proxy";
};

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function createPlayerCommandTarget(
  config: PlexConfig,
  clientIdentifier: string,
  options: { directBaseUri?: string | null; preferProxy?: boolean },
): PlayerCommandTarget {
  const serverBase = normalizeUrl(config.serverUrl);
  if (!options.preferProxy && options.directBaseUri) {
    return {
      requestBase: normalizeUrl(options.directBaseUri),
      token: config.token,
      targetClientId: clientIdentifier,
      mode: "direct",
    };
  }
  return {
    requestBase: serverBase,
    token: config.token,
    targetClientId: clientIdentifier,
    mode: "proxy",
  };
}

export async function fetchPlayerPath(
  target: PlayerCommandTarget,
  path: string,
  timeoutMs = 5000,
): Promise<Response> {
  const headers: Record<string, string> = { ...plexMediaHeaders(target.token) };
  if (target.mode === "proxy") {
    headers["X-Plex-Target-Client-Identifier"] = target.targetClientId;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${target.requestBase}${path}`, {
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
