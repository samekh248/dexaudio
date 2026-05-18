import { describe, expect, it, vi, beforeEach } from "vitest";
import * as idb from "@/lib/indexed-db";
import { promoteToPermanent, getPinnedKeys } from "@/lib/pin-service";

vi.mock("@/lib/indexed-db", () => ({
  getAllCacheEntries: vi.fn(),
  putCacheEntry: vi.fn(),
}));

describe("promoteToPermanent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when entry missing", async () => {
    vi.mocked(idb.getAllCacheEntries).mockResolvedValue([]);
    expect(await promoteToPermanent("missing")).toBe(false);
  });

  it("promotes when under cap", async () => {
    vi.mocked(idb.getAllCacheEntries).mockResolvedValue([
      {
        track_rating_key: "t1",
        cache_kind: "pre-cache",
        version_signal: "v",
        blob: new Blob(["x"]),
        byte_size: 100,
        last_accessed_at: 1,
        pinned: false,
      },
    ]);
    vi.mocked(idb.putCacheEntry).mockResolvedValue();
    expect(await promoteToPermanent("t1")).toBe(true);
  });

  it("getPinnedKeys returns array", () => {
    expect(Array.isArray(getPinnedKeys())).toBe(true);
  });
});
