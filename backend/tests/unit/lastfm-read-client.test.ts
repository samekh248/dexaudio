import { afterEach, describe, expect, it, vi } from "vitest";
import { getRecentTracksPage, getUserPlaycount } from "../../src/services/lastfm/lastfm-read-client.js";

describe("lastfm-read-client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses recent tracks and skips now playing", async () => {
    const body = {
      recenttracks: {
        "@attr": { page: "1", totalPages: "1" },
        track: [
          {
            name: "Track A",
            artist: { "#text": "Artist A", mbid: "" },
            album: { "#text": "Album A", mbid: "" },
            date: { uts: "1700000000" },
            image: [{ "#text": "http://img/large.jpg", size: "large" }],
          },
          {
            name: "Live",
            artist: "Artist",
            "@attr": { nowplaying: "true" },
          },
        ],
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => body }));
    const page = await getRecentTracksPage("key", "user", 1);
    expect(page.tracks).toHaveLength(1);
    expect(page.tracks[0]?.track).toBe("Track A");
    expect(page.tracks[0]?.imageUrl).toContain("large.jpg");
  });

  it("reads user playcount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { playcount: "1234" } }),
      }),
    );
    expect(await getUserPlaycount("key", "user")).toBe(1234);
  });
});
