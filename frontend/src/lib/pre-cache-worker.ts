import type { Track } from "@dexaudio/shared-types";
import { writeToCache } from "./cache-service.js";
import { buildGaplessSlots } from "./gapless-cache-slots.js";
import { getItem, isGaplessPlaybackEnabled, StorageKeys } from "./local-storage.js";

async function cacheTrack(
  track: Track,
  protectedKeys: ReadonlySet<string>,
): Promise<void> {
  if (track.format === "unsupported") return;
  try {
    const blob = await fetch(`/api/v1/stream/${track.id}`).then((r) => r.blob());
    const versionSignal = `${track.id}-${blob.size}`;
    await writeToCache(track.id, blob, versionSignal, "pre-cache", false, protectedKeys);
  } catch {
    // skip failed pre-cache
  }
}

export async function preCacheUpcoming(tracks: Track[], currentIndex: number): Promise<void> {
  const lookAhead = getItem(StorageKeys.preCacheLookAhead, 3);
  const upcoming = tracks.slice(currentIndex + 1, currentIndex + 1 + lookAhead);

  for (const track of upcoming) {
    await cacheTrack(track, new Set());
  }
}

export async function preCacheGaplessNeighbors(
  tracks: Track[],
  currentIndex: number,
  generation: number,
  isStale: () => boolean,
): Promise<void> {
  const trackIds = tracks.map((t) => t.id);
  const slots = buildGaplessSlots(tracks.length, currentIndex, trackIds);
  const protectedKeys = new Set(slots.map((s) => s.trackId));

  const lookAhead = getItem(StorageKeys.preCacheLookAhead, 3);
  const effectiveForward = Math.max(lookAhead, 2);
  for (let d = 1; d <= effectiveForward; d++) {
    const idx = currentIndex + d;
    if (idx < tracks.length) protectedKeys.add(tracks[idx].id);
  }

  for (const slot of slots) {
    if (isStale() || generation !== getActivePreCacheGeneration()) return;
    const track = tracks[slot.queueIndex];
    if (!track) continue;
    await cacheTrack(track, protectedKeys);
  }
}

let activePreCacheGeneration = 0;

export function bumpPreCacheGeneration(): number {
  activePreCacheGeneration += 1;
  return activePreCacheGeneration;
}

function getActivePreCacheGeneration(): number {
  return activePreCacheGeneration;
}

export async function runPreCacheForPlayback(
  tracks: Track[],
  currentIndex: number,
  generation: number,
): Promise<void> {
  const stale = () => generation !== getActivePreCacheGeneration();
  if (isGaplessPlaybackEnabled()) {
    await preCacheGaplessNeighbors(tracks, currentIndex, generation, stale);
  } else {
    await preCacheUpcoming(tracks, currentIndex);
  }
}
