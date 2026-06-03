import type { RemoteControlAction } from "@dexaudio/shared-types";
import type { PlexConfig } from "./plex-client.js";
import { fetchPlayerPath, type PlayerCommandTarget } from "./plex-player-endpoint.js";

/** @internal exported for unit tests */
export function playMediaPath(ratingKey: string, offsetMs = 0): string {
  const key = encodeURIComponent(`/library/metadata/${ratingKey}`);
  const offset = offsetMs > 0 ? `&offset=${offsetMs}` : "";
  return `/player/playback/playMedia?key=${key}&type=music${offset}`;
}

/** @internal exported for unit tests */
export function playQueuePath(playQueueId: string): string {
  return `/player/playback/playQueue?playQueueID=${encodeURIComponent(playQueueId)}`;
}

/** @internal exported for unit tests */
export function controlPath(action: RemoteControlAction, seekToMs?: number): string {
  switch (action) {
    case "pause":
      return "/player/playback/pause";
    case "resume":
      return "/player/playback/play";
    case "stop":
      return "/player/playback/stop";
    case "skipNext":
      return "/player/playback/skipNext";
    case "skipPrevious":
      return "/player/playback/skipPrevious";
    case "seek":
      return `/player/playback/seekTo?offset=${seekToMs ?? 0}`;
    default:
      return "/player/playback/stop";
  }
}

export async function playMedia(
  target: PlayerCommandTarget,
  ratingKey: string,
  offsetMs = 0,
): Promise<void> {
  const res = await fetchPlayerPath(target, playMediaPath(ratingKey, offsetMs));
  if (!res.ok) {
    throw new Error(`Remote play failed (${res.status})`);
  }
}

export async function playQueueOnClient(
  target: PlayerCommandTarget,
  playQueueId: string,
): Promise<void> {
  const res = await fetchPlayerPath(target, playQueuePath(playQueueId));
  if (!res.ok) {
    throw new Error(`Remote play queue failed (${res.status})`);
  }
}

export async function sendTransportCommand(
  target: PlayerCommandTarget,
  action: RemoteControlAction,
  seekToMs?: number,
): Promise<void> {
  if (action === "seek" && seekToMs === undefined) {
    throw new Error("seekToMs required for seek");
  }
  const res = await fetchPlayerPath(target, controlPath(action, seekToMs));
  if (!res.ok) {
    throw new Error(`Remote control failed (${res.status})`);
  }
}

export async function stopPlayback(target: PlayerCommandTarget): Promise<void> {
  try {
    await sendTransportCommand(target, "stop");
  } catch {
    // Idempotent stop — ignore unreachable player
  }
}

export function metadataUri(config: PlexConfig, ratingKey: string): string {
  const machineId = config.machineIdentifier ?? "localhost";
  return `server://${machineId}/com.plexapp.plugins.library/library/metadata/${ratingKey}`;
}
