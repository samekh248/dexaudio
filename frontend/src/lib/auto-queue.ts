import type { Track } from "@dexaudio/shared-types";
import { api } from "@/services/api-client.js";
import { getItem, StorageKeys } from "./local-storage.js";

export async function prefetchSimilarIfNeeded(
  currentTrack: Track,
  queueLength: number,
): Promise<Track[]> {
  const enabled = getItem(StorageKeys.autoQueueSimilar, true);
  if (!enabled || queueLength > 1) return [];
  try {
    return await api.getSimilarTracks(currentTrack.id, 10);
  } catch {
    return [];
  }
}
