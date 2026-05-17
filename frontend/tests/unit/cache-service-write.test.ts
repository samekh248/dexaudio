import { describe, expect, it, vi, beforeEach } from "vitest";
import * as idb from "@/lib/indexed-db";
import { writeToCache, clearPreCache, clearAllCache } from "@/lib/cache-service";

vi.mock("@/lib/indexed-db", () => ({
  getAllCacheEntries: vi.fn(),
  putCacheEntry: vi.fn(),
  deleteCacheEntry: vi.fn(),
  getCacheEntry: vi.fn(),
}));

describe("cache write and clear", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes pre-cache entry", async () => {
    vi.mocked(idb.getAllCacheEntries).mockResolvedValue([]);
    vi.mocked(idb.putCacheEntry).mockResolvedValue();
    await writeToCache("t1", new Blob(["a"]), "v1", "pre-cache");
    expect(idb.putCacheEntry).toHaveBeenCalled();
  });

  it("clears caches", async () => {
    vi.mocked(idb.getAllCacheEntries).mockResolvedValue([
      {
        track_rating_key: "a",
        cache_kind: "pre-cache",
        version_signal: "v",
        blob: new Blob(),
        byte_size: 1,
        last_accessed_at: 1,
        pinned: false,
      },
    ]);
    vi.mocked(idb.deleteCacheEntry).mockResolvedValue();
    await clearPreCache();
    await clearAllCache();
    expect(idb.deleteCacheEntry).toHaveBeenCalled();
  });
});
