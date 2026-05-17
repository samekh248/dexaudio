import { describe, expect, it, vi, beforeEach } from "vitest";
import { startListening, updateListenPosition, checkAndScrobble } from "@/lib/scrobble-tracker";
import { api } from "@/services/api-client";

vi.mock("@/services/api-client", () => ({
  api: { submitScrobble: vi.fn() },
}));

vi.mock("@/lib/indexed-db", () => ({
  addPendingScrobble: vi.fn(),
  getPendingScrobbles: vi.fn().mockResolvedValue([]),
  removePendingScrobble: vi.fn(),
}));

const track = {
  id: "1",
  title: "Song",
  artist: "Artist",
  album: "Album",
  durationMs: 180_000,
  format: "mp3" as const,
};

describe("scrobble tracker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits scrobble when threshold met", async () => {
    vi.mocked(api.submitScrobble).mockResolvedValue({});
    startListening(track);
    updateListenPosition(120_000);
    await checkAndScrobble();
    expect(api.submitScrobble).toHaveBeenCalled();
  });
});
