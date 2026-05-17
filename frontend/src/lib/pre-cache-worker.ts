import type { Track } from "@dexaudio/shared-types";
import { writeToCache } from "./cache-service.js";
import { getItem, StorageKeys } from "./local-storage.js";

export async function preCacheUpcoming(tracks: Track[], currentIndex: number): Promise<void> {
  const lookAhead = getItem(StorageKeys.preCacheLookAhead, 3);
  const upcoming = tracks.slice(currentIndex + 1, currentIndex + 1 + lookAhead);

  for (const track of upcoming) {
    if (track.format === "unsupported") continue;
    try {
      const blob = await fetch(`/api/v1/stream/${track.id}`).then((r) => r.blob());
      const versionSignal = `${track.id}-${blob.size}`;
      await writeToCache(track.id, blob, versionSignal, "pre-cache");
    } catch {
      // skip failed pre-cache
    }
  }
}
