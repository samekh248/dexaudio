import { describe, expect, it } from "vitest";
import { bytesToGb, selectEvictionCandidates } from "@/lib/cache-lru";
import type { CacheEntry } from "@/lib/indexed-db";

function entry(key: string, bytes: number, accessed: number): CacheEntry {
  return {
    track_rating_key: key,
    cache_kind: "pre-cache",
    version_signal: "v1",
    blob: new Blob(),
    byte_size: bytes,
    last_accessed_at: accessed,
    pinned: false,
  };
}

describe("pre-cache LRU eviction", () => {
  it("evicts oldest pre-cache entries when over cap", () => {
    const entries = [
      entry("a", 500, 1),
      entry("b", 500, 2),
      entry("c", 500, 3),
    ];
    const evict = selectEvictionCandidates(entries, 1000);
    expect(evict).toContain("a");
    expect(evict.length).toBeGreaterThanOrEqual(1);
  });

  it("converts bytes to gigabytes", () => {
    expect(bytesToGb(1024 * 1024 * 1024)).toBe(1);
  });

  it("does not evict pinned or permanent entries", () => {
    const entries = [
      { ...entry("p", 2000, 1), pinned: true },
    ];
    expect(selectEvictionCandidates(entries, 1000)).toEqual([]);
  });
});
