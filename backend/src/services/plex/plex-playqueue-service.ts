import { decodeXmlEntities } from "../../lib/xml-entities.js";
import type { PlexConfig } from "./plex-client.js";
import { plexMediaHeaders } from "./plex-client.js";
import * as remote from "./plex-remote-service.js";
import type { PlayerCommandTarget } from "./plex-player-endpoint.js";

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/** @internal exported for unit tests */
export function buildPlayQueueCreateUrl(
  serverUrl: string,
  ratingKeys: string[],
  machineIdentifier: string,
): string {
  const base = normalizeUrl(serverUrl);
  const params = new URLSearchParams({
    type: "audio",
    repeat: "0",
    shuffle: "0",
  });
  for (const key of ratingKeys) {
    params.append(
      "uri",
      `server://${machineIdentifier}/com.plexapp.plugins.library/library/metadata/${key}`,
    );
  }
  return `${base}/playQueues?${params.toString()}`;
}

function parsePlayQueueId(xml: string): string | null {
  const match = /playQueueID="(\d+)"/i.exec(xml) ?? /playQueueId="(\d+)"/i.exec(xml);
  return match?.[1] ?? null;
}

export type PlayQueueResult = {
  playQueueId: string | null;
  degraded: boolean;
  message?: string;
  truncated?: boolean;
};

const MAX_QUEUE_ITEMS = 100;

export async function createPlayQueue(
  config: PlexConfig,
  ratingKeys: string[],
): Promise<PlayQueueResult> {
  const machineId = config.machineIdentifier;
  if (!machineId || ratingKeys.length === 0) {
    return { playQueueId: null, degraded: true, message: "Play queue unavailable" };
  }

  const keys = ratingKeys.slice(0, MAX_QUEUE_ITEMS);
  const truncated = ratingKeys.length > MAX_QUEUE_ITEMS;
  const url = buildPlayQueueCreateUrl(config.serverUrl, keys, machineId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: plexMediaHeaders(config.token),
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        playQueueId: null,
        degraded: true,
        message: "Could not create play queue on Plex",
        truncated,
      };
    }
    const xml = await res.text();
    const playQueueId = parsePlayQueueId(xml);
    if (!playQueueId) {
      return {
        playQueueId: null,
        degraded: true,
        message: "Play queue response missing id",
        truncated,
      };
    }
    return { playQueueId, degraded: false, truncated };
  } catch {
    return {
      playQueueId: null,
      degraded: true,
      message: "Play queue request timed out",
      truncated,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function updatePlayQueue(
  config: PlexConfig,
  playQueueId: string,
  ratingKeys: string[],
  currentIndex: number,
): Promise<PlayQueueResult> {
  const machineId = config.machineIdentifier;
  if (!machineId) {
    return { playQueueId: null, degraded: true, message: "Play queue unavailable" };
  }
  const keys = ratingKeys.slice(0, MAX_QUEUE_ITEMS);
  const truncated = ratingKeys.length > MAX_QUEUE_ITEMS;
  const base = normalizeUrl(config.serverUrl);
  const params = new URLSearchParams({ playQueueID: playQueueId });
  for (const key of keys) {
    params.append("uri", remote.metadataUri(config, key));
  }
  params.set("key", `${base}/playQueues/${playQueueId}`);
  if (currentIndex > 0) {
    params.set("offset", String(currentIndex));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}/playQueues/${playQueueId}?${params.toString()}`, {
      method: "PUT",
      headers: plexMediaHeaders(config.token),
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        playQueueId,
        degraded: true,
        message: "Could not update play queue",
        truncated,
      };
    }
    return { playQueueId, degraded: false, truncated };
  } catch {
    return {
      playQueueId,
      degraded: true,
      message: "Play queue update timed out",
      truncated,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function syncQueueToPlayer(
  config: PlexConfig,
  playerTarget: PlayerCommandTarget,
  ratingKeys: string[],
  currentIndex: number,
  existingPlayQueueId: string | null,
  playCurrentTrack: boolean,
): Promise<{ playQueueId: string | null; degraded: boolean; message?: string; truncated?: boolean }> {
  let result: PlayQueueResult;
  if (existingPlayQueueId) {
    result = await updatePlayQueue(config, existingPlayQueueId, ratingKeys, currentIndex);
  } else {
    result = await createPlayQueue(config, ratingKeys);
  }

  if (result.degraded || !result.playQueueId) {
    if (playCurrentTrack && ratingKeys[currentIndex]) {
      await remote.playMedia(playerTarget, ratingKeys[currentIndex]);
    }
    return result;
  }

  if (playCurrentTrack) {
    await remote.playQueueOnClient(playerTarget, result.playQueueId);
  }
  return result;
}
