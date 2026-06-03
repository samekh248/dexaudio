import type { NetworkPlayer, PlayerListEmptyReason } from "@dexaudio/shared-types";
import { PLEX_CLIENT_ID } from "../../lib/config.js";
import { decodeXmlEntities } from "../../lib/xml-entities.js";
import type { PlexConfig } from "./plex-client.js";
import {
  createPlayerCommandTarget,
  fetchPlayerPath,
  type PlayerCommandTarget,
} from "./plex-player-endpoint.js";
import { plexMediaHeaders } from "./plex-client.js";

export type DiscoveredClient = NetworkPlayer & {
  baseUri: string | null;
};

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1]] = decodeXmlEntities(m[2]);
  }
  return attrs;
}

/** @internal exported for unit tests */
export function parseClientsXml(xml: string): Array<Record<string, string>> {
  const clients: Array<Record<string, string>> = [];
  const tagRegex = /<(Server|Player|Device)\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(xml)) !== null) {
    clients.push(parseAttrs(match[2]));
  }
  return clients;
}

function schemeForProtocol(protocol?: string): string {
  const p = (protocol ?? "http").toLowerCase();
  if (p === "https" || p === "https-only") return "https";
  return "http";
}

/** @internal exported for unit tests */
export function buildClientBaseUri(attrs: Record<string, string>): string | null {
  const uri = attrs.uri ?? attrs.host;
  if (uri?.startsWith("http")) return uri.replace(/\/$/, "");
  const protocol = schemeForProtocol(attrs.protocol);
  const address = attrs.address ?? attrs.host;
  const port = attrs.port;
  if (!address) return null;
  if (address.includes("://")) return address.replace(/\/$/, "");
  return `${protocol}://${address}${port ? `:${port}` : ""}`.replace(/\/$/, "");
}

/** @internal exported for unit tests */
export function isMusicNetworkPlayer(attrs: Record<string, string>): boolean {
  if (attrs.machineIdentifier === PLEX_CLIENT_ID) return false;
  const product = (attrs.product ?? "").toLowerCase();
  if (product.includes("dexaudio")) return false;

  const provides = (attrs.provides ?? "").toLowerCase();
  const caps = (attrs.protocolCapabilities ?? "").toLowerCase();

  const canPlayback =
    provides.includes("player") || caps.includes("playback") || product.includes("plexamp");

  if (!canPlayback) return false;

  if (provides.includes("video") && !provides.includes("music") && !provides.includes("audio")) {
    if (!caps.includes("music") && !product.includes("plexamp") && !product.includes("plex web")) {
      return false;
    }
  }

  const videoOnlyProducts = ["plex for roku", "plex for fire tv", "plex for xbox"];
  if (videoOnlyProducts.some((p) => product.includes(p))) return false;

  return true;
}

async function probeTarget(target: PlayerCommandTarget, timeoutMs = 2000): Promise<boolean> {
  try {
    const res = await fetchPlayerPath(target, "/player/timeline/poll?wait=0", timeoutMs);
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function probePlayerReachable(
  config: PlexConfig,
  clientIdentifier: string,
  directBaseUri: string | null,
): Promise<{ reachable: boolean; route: PlayerCommandTarget | null }> {
  if (directBaseUri) {
    const direct = createPlayerCommandTarget(config, clientIdentifier, { directBaseUri });
    if (await probeTarget(direct)) {
      return { reachable: true, route: direct };
    }
  }
  const proxy = createPlayerCommandTarget(config, clientIdentifier, {
    directBaseUri: null,
    preferProxy: true,
  });
  if (await probeTarget(proxy)) {
    return { reachable: true, route: proxy };
  }
  return { reachable: false, route: null };
}

export async function fetchNetworkPlayers(
  config: PlexConfig,
  options: { refresh?: boolean } = {},
): Promise<{ players: DiscoveredClient[]; emptyReason?: PlayerListEmptyReason }> {
  const base = normalizeUrl(config.serverUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let xml: string;
  try {
    const res = await fetch(`${base}/clients`, {
      headers: plexMediaHeaders(config.token),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { players: [], emptyReason: "server_unreachable" };
    }
    xml = await res.text();
  } catch {
    return { players: [], emptyReason: "server_unreachable" };
  } finally {
    clearTimeout(timer);
  }

  const raw = parseClientsXml(xml);
  const candidates = raw.filter(isMusicNetworkPlayer);
  if (candidates.length === 0) {
    return { players: [], emptyReason: "no_players" };
  }

  const players: DiscoveredClient[] = [];
  for (const attrs of candidates) {
    const clientIdentifier = attrs.machineIdentifier;
    const name = attrs.name ?? attrs.product ?? "Plex Player";
    const product = attrs.product ?? "Plex";
    if (!clientIdentifier) continue;
    const baseUri = buildClientBaseUri(attrs);
    let reachable = Boolean(baseUri);
    let route: PlayerCommandTarget | null = null;

    if (options.refresh) {
      const probe = await probePlayerReachable(config, clientIdentifier, baseUri);
      reachable = probe.reachable;
      route = probe.route;
    } else if (baseUri) {
      route = createPlayerCommandTarget(config, clientIdentifier, { directBaseUri: baseUri });
      reachable = true;
    } else {
      route = createPlayerCommandTarget(config, clientIdentifier, { preferProxy: true });
      reachable = true;
    }

    if (route) cachePlayerRoute(clientIdentifier, route);

    players.push({
      clientIdentifier,
      name,
      product,
      device: attrs.device,
      platform: attrs.platform,
      reachable,
      supportsSeek: true,
      supportsQueueSync:
        product.toLowerCase().includes("plexamp") || product.toLowerCase().includes("plex web"),
      baseUri,
    });
  }

  if (players.length === 0) {
    return { players: [], emptyReason: "no_players" };
  }
  if (options.refresh && !players.some((p) => p.reachable)) {
    return { players, emptyReason: "remote_control_disabled" };
  }
  return { players };
}

const clientRouteCache = new Map<string, PlayerCommandTarget>();

export function cachePlayerRoute(clientIdentifier: string, route: PlayerCommandTarget): void {
  clientRouteCache.set(clientIdentifier, route);
}

export async function resolvePlayerTarget(
  config: PlexConfig,
  clientIdentifier: string,
): Promise<PlayerCommandTarget | null> {
  const cached = clientRouteCache.get(clientIdentifier);
  if (cached?.token === config.token && (await probeTarget(cached, 1500))) {
    return cached;
  }

  const { players } = await fetchNetworkPlayers(config, { refresh: true });
  const match = players.find((p) => p.clientIdentifier === clientIdentifier);
  if (!match) return null;

  const route = clientRouteCache.get(clientIdentifier);
  if (route) return route;

  if (match.baseUri) {
    const direct = createPlayerCommandTarget(config, clientIdentifier, {
      directBaseUri: match.baseUri,
    });
    if (await probeTarget(direct, 1500)) {
      cachePlayerRoute(clientIdentifier, direct);
      return direct;
    }
  }
  const proxy = createPlayerCommandTarget(config, clientIdentifier, { preferProxy: true });
  if (await probeTarget(proxy, 1500)) {
    cachePlayerRoute(clientIdentifier, proxy);
    return proxy;
  }
  return null;
}

/** @internal test helper */
export function clearClientUriCacheForTests(): void {
  clientRouteCache.clear();
}
