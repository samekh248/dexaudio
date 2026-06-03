import type { PlayerStatus } from "@dexaudio/shared-types";
import { decodeXmlEntities } from "../../lib/xml-entities.js";
import { fetchPlayerPath, type PlayerCommandTarget } from "./plex-player-endpoint.js";

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
export function parsePlayerStatus(xml: string, clientIdentifier: string): PlayerStatus {
  const containerMatch = /<MediaContainer\b([^>]*?)>/.exec(xml);
  const container = containerMatch ? parseAttrs(containerMatch[1]) : {};

  const playerMatch = /<Player\b([^>]*?)\/?>/.exec(xml);
  const player = playerMatch ? parseAttrs(playerMatch[1]) : {};

  const trackMatch = /<Track\b([^>]*?)\/?>/.exec(xml) ?? /<Video\b([^>]*?)\/?>/.exec(xml);
  const track = trackMatch ? parseAttrs(trackMatch[1]) : {};

  const stateRaw = (player.state ?? container.state ?? "unknown").toLowerCase();
  const state = (
    ["playing", "paused", "stopped", "idle"].includes(stateRaw) ? stateRaw : "unknown"
  ) as PlayerStatus["state"];

  const ratingKey = track.ratingKey ?? track.key?.replace(/.*\/metadata\//, "") ?? null;
  const positionMs = Number(player.time ?? container.offset ?? 0) || 0;
  const durationMs = Number(track.duration ?? player.duration ?? 0) || 0;

  return {
    clientIdentifier,
    state,
    ratingKey: ratingKey ? String(ratingKey) : null,
    title: track.title ?? null,
    artist: track.grandparentTitle ?? track.parentTitle ?? null,
    album: track.parentTitle ?? null,
    positionMs,
    durationMs,
    queueItemId: track.playQueueItemID ?? track.playQueueItemId ?? null,
  };
}

export async function fetchPlayerStatus(
  target: PlayerCommandTarget,
  clientIdentifier: string,
): Promise<PlayerStatus> {
  try {
    const res = await fetchPlayerPath(target, "/player/timeline/poll?wait=0", 5000);
    if (!res.ok) {
      return {
        clientIdentifier,
        state: "unknown",
        ratingKey: null,
        title: null,
        artist: null,
        album: null,
        positionMs: 0,
        durationMs: 0,
      };
    }
    const xml = await res.text();
    return parsePlayerStatus(xml, clientIdentifier);
  } catch {
    return {
      clientIdentifier,
      state: "unknown",
      ratingKey: null,
      title: null,
      artist: null,
      album: null,
      positionMs: 0,
      durationMs: 0,
    };
  }
}
