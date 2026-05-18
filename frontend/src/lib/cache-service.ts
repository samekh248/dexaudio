import {
  deleteCacheEntry,
  getAllCacheEntries,
  getCacheEntry,
  putCacheEntry,
} from "./indexed-db.js";
import { selectEvictionCandidates } from "./cache-lru.js";
import { getItem, StorageKeys } from "./local-storage.js";

export async function readFromCache(trackKey: string): Promise<Blob | null> {
  const entry = await getCacheEntry(trackKey);
  if (!entry) return null;
  entry.last_accessed_at = Date.now();
  await putCacheEntry(entry);
  return entry.blob;
}

export async function writeToCache(
  trackKey: string,
  blob: Blob,
  versionSignal: string,
  kind: "pre-cache" | "permanent",
  pinned = false,
): Promise<void> {
  const capGb = kind === "pre-cache"
    ? getItem(StorageKeys.preCapGb, 2)
    : getItem(StorageKeys.permanentCapGb, 10);

  if (kind === "pre-cache") {
    const entries = await getAllCacheEntries();
    const toEvict = selectEvictionCandidates(entries, capGb * 1024 * 1024 * 1024);
    for (const key of toEvict) await deleteCacheEntry(key);
  }

  await putCacheEntry({
    track_rating_key: trackKey,
    cache_kind: kind,
    version_signal: versionSignal,
    blob,
    byte_size: blob.size,
    last_accessed_at: Date.now(),
    pinned,
  });
}

export async function invalidateStale(trackKey: string, versionSignal: string): Promise<boolean> {
  const entry = await getCacheEntry(trackKey);
  if (!entry) return false;
  if (entry.version_signal !== versionSignal) {
    await deleteCacheEntry(trackKey);
    return true;
  }
  return false;
}

export async function getCacheUsage(): Promise<{ preBytes: number; permanentBytes: number }> {
  const entries = await getAllCacheEntries();
  let preBytes = 0;
  let permanentBytes = 0;
  for (const e of entries) {
    if (e.cache_kind === "permanent") permanentBytes += e.byte_size;
    else preBytes += e.byte_size;
  }
  return { preBytes, permanentBytes };
}

export async function clearPreCache(): Promise<void> {
  const entries = await getAllCacheEntries();
  for (const e of entries.filter((x) => x.cache_kind === "pre-cache")) {
    await deleteCacheEntry(e.track_rating_key);
  }
}

export async function clearAllCache(): Promise<void> {
  const entries = await getAllCacheEntries();
  for (const e of entries) await deleteCacheEntry(e.track_rating_key);
}
