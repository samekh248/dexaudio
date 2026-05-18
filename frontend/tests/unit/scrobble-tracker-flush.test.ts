import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPendingScrobbles } from "@/lib/scrobble-tracker";
import { api } from "@/services/api-client";
import * as idb from "@/lib/indexed-db";

vi.mock("@/services/api-client", () => ({ api: { submitScrobble: vi.fn() } }));
vi.mock("@/lib/indexed-db", () => ({
  getPendingScrobbles: vi.fn(),
  removePendingScrobble: vi.fn(),
  addPendingScrobble: vi.fn(),
}));

describe("flushPendingScrobbles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flushes valid pending scrobbles", async () => {
    vi.mocked(idb.getPendingScrobbles).mockResolvedValue([
      {
        id: "1",
        scrobble: { track: "T", artist: "A", album: "B", played_at: new Date().toISOString() },
        expires_at: Date.now() + 99999,
      },
    ]);
    vi.mocked(api.submitScrobble).mockResolvedValue({});
    vi.mocked(idb.removePendingScrobble).mockResolvedValue();
    const n = await flushPendingScrobbles();
    expect(n).toBe(1);
  });

  it("drops expired scrobbles", async () => {
    vi.mocked(idb.getPendingScrobbles).mockResolvedValue([
      {
        id: "2",
        scrobble: { track: "T", artist: "A", album: "B", played_at: new Date().toISOString() },
        expires_at: Date.now() - 1,
      },
    ]);
    vi.mocked(idb.removePendingScrobble).mockResolvedValue();
    const n = await flushPendingScrobbles();
    expect(n).toBe(0);
    expect(idb.removePendingScrobble).toHaveBeenCalledWith("2");
  });
});
