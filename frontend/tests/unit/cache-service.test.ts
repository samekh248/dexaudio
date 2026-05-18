import { describe, expect, it, vi, beforeEach } from "vitest";
import * as idb from "@/lib/indexed-db";
import { readFromCache, invalidateStale, getCacheUsage } from "@/lib/cache-service";

vi.mock("@/lib/indexed-db", () => ({
  getCacheEntry: vi.fn(),
  putCacheEntry: vi.fn(),
  deleteCacheEntry: vi.fn(),
  getAllCacheEntries: vi.fn(),
}));

describe("cache service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns blob from cache", async () => {
    const blob = new Blob(["audio"]);
    vi.mocked(idb.getCacheEntry).mockResolvedValue({
      track_rating_key: "1",
      cache_kind: "pre-cache",
      version_signal: "v1",
      blob,
      byte_size: 5,
      last_accessed_at: 1,
      pinned: false,
    });
    vi.mocked(idb.putCacheEntry).mockResolvedValue();
    const result = await readFromCache("1");
    expect(result).toBe(blob);
  });

  it("invalidates stale entries", async () => {
    vi.mocked(idb.getCacheEntry).mockResolvedValue({
      track_rating_key: "1",
      cache_kind: "pre-cache",
      version_signal: "old",
      blob: new Blob(),
      byte_size: 1,
      last_accessed_at: 1,
      pinned: false,
    });
    vi.mocked(idb.deleteCacheEntry).mockResolvedValue();
    const stale = await invalidateStale("1", "new");
    expect(stale).toBe(true);
    expect(idb.deleteCacheEntry).toHaveBeenCalledWith("1");
  });

  it("computes usage totals", async () => {
    vi.mocked(idb.getAllCacheEntries).mockResolvedValue([
      {
        track_rating_key: "a",
        cache_kind: "pre-cache",
        version_signal: "v",
        blob: new Blob(),
        byte_size: 100,
        last_accessed_at: 1,
        pinned: false,
      },
      {
        track_rating_key: "b",
        cache_kind: "permanent",
        version_signal: "v",
        blob: new Blob(),
        byte_size: 200,
        last_accessed_at: 1,
        pinned: true,
      },
    ]);
    const usage = await getCacheUsage();
    expect(usage.preBytes).toBe(100);
    expect(usage.permanentBytes).toBe(200);
  });
});
