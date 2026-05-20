import type { CacheEntry } from "./indexed-db.js";

export function selectEvictionCandidates(
  entries: CacheEntry[],
  capBytes: number,
  protectedKeys: ReadonlySet<string> = new Set(),
): string[] {
  const preCache = entries.filter((e) => e.cache_kind === "pre-cache" && !e.pinned);
  const total = preCache.reduce((sum, e) => sum + e.byte_size, 0);
  if (total <= capBytes) return [];

  const lru = (a: CacheEntry, b: CacheEntry) => a.last_accessed_at - b.last_accessed_at;
  const unprotected = preCache
    .filter((e) => !protectedKeys.has(e.track_rating_key))
    .sort(lru);
  const protectedEntries = preCache
    .filter((e) => protectedKeys.has(e.track_rating_key))
    .sort(lru);

  const toEvict: string[] = [];
  let size = total;
  for (const entry of [...unprotected, ...protectedEntries]) {
    if (size <= capBytes) break;
    toEvict.push(entry.track_rating_key);
    size -= entry.byte_size;
  }
  return toEvict;
}

export function bytesToGb(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}
