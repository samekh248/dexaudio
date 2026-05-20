import { describe, expect, it, vi } from "vitest";
import * as spotlightRepo from "../../src/services/plex/artist-spotlight-repo.js";
import * as libraryService from "../../src/services/plex/library-service.js";
import type { AlbumWithStats } from "../../src/services/plex/plex-client.js";
import {
  getEligibleArtistIds,
  selectHiddenGems,
  selectRandomPicks,
  selectRecentlyAdded,
  selectRecentlyPlayed,
  HIDDEN_GEMS_RATING_MIN,
  NEGLECT_MS,
} from "../../src/services/plex/album-groups-service.js";

function album(
  partial: Partial<AlbumWithStats> & Pick<AlbumWithStats, "id" | "title" | "artist">,
): AlbumWithStats {
  return {
    id: partial.id,
    title: partial.title,
    artist: partial.artist,
    year: partial.year,
    artUrl: partial.artUrl,
    playCount: partial.playCount,
    pinned: partial.pinned,
    userRating: partial.userRating,
    addedAt: partial.addedAt,
    artistId: partial.artistId,
    lastPlayedAt: partial.lastPlayedAt,
    playCount30d: partial.playCount30d,
  };
}

describe("album-groups-service selection", () => {
  const now = new Date("2026-05-19T12:00:00Z").getTime();

  it("selects recently played by 30-day play count", () => {
    const albums = [
      album({ id: "1", title: "A", artist: "X", playCount30d: 1 }),
      album({ id: "2", title: "B", artist: "X", playCount30d: 5, lastPlayedAt: new Date(now) }),
      album({ id: "3", title: "C", artist: "X", playCount30d: 0 }),
    ];
    const result = selectRecentlyPlayed(albums, now);
    expect(result.map((a) => a.id)).toEqual(["2", "1"]);
  });

  it("selects recently added by addedAt desc", () => {
    const albums = [
      album({ id: "1", title: "Old", artist: "X", addedAt: "2020-01-01T00:00:00.000Z" }),
      album({ id: "2", title: "New", artist: "X", addedAt: "2026-05-01T00:00:00.000Z" }),
    ];
    expect(selectRecentlyAdded(albums).map((a) => a.id)).toEqual(["2", "1"]);
  });

  it("filters hidden gems by rating and neglect", () => {
    const neglectBefore = now - NEGLECT_MS;
    const albums = [
      album({
        id: "low",
        title: "Low",
        artist: "X",
        userRating: HIDDEN_GEMS_RATING_MIN - 1,
        lastPlayedAt: new Date(neglectBefore - 1),
      }),
      album({
        id: "gem",
        title: "Gem",
        artist: "X",
        userRating: 8,
        lastPlayedAt: new Date(neglectBefore - 1),
      }),
      album({
        id: "recent",
        title: "Recent",
        artist: "X",
        userRating: 10,
        lastPlayedAt: new Date(now),
      }),
    ];
    expect(selectHiddenGems(albums, now).map((a) => a.id)).toEqual(["gem"]);
  });

  it("returns up to limit random distinct albums", () => {
    const albums = Array.from({ length: 25 }, (_, i) =>
      album({ id: String(i), title: `T${i}`, artist: "A" }),
    );
    const picks = selectRandomPicks(albums, 10);
    expect(picks).toHaveLength(10);
    expect(new Set(picks.map((a) => a.id)).size).toBe(10);
  });

  it("respects limit 20 for recently added", () => {
    const albums = Array.from({ length: 25 }, (_, i) =>
      album({
        id: String(i),
        title: `T${i}`,
        artist: "A",
        addedAt: new Date(2026, 0, i + 1).toISOString(),
      }),
    );
    expect(selectRecentlyAdded(albums, 20)).toHaveLength(20);
  });

  it("excludes artists with exactly 2 albums from eligibility", () => {
    const albums = [
      album({ id: "a1", title: "A1", artist: "Two", artistId: "two" }),
      album({ id: "a2", title: "A2", artist: "Two", artistId: "two" }),
      album({ id: "b1", title: "B1", artist: "Three", artistId: "three" }),
      album({ id: "b2", title: "B2", artist: "Three", artistId: "three" }),
      album({ id: "b3", title: "B3", artist: "Three", artistId: "three" }),
    ];
    const eligible = getEligibleArtistIds(albums);
    expect(eligible.has("two")).toBe(false);
    expect(eligible.get("three")?.albums).toHaveLength(3);
  });
});

describe("getArtistSpotlights markShown guard", () => {
  it("does not call markShown when limit is 20", async () => {
    vi.spyOn(libraryService, "getAllAlbumsWithStats").mockResolvedValue([]);
    vi.spyOn(libraryService, "getAlbumPlayCounts30d").mockResolvedValue(new Map());
    const markShown = vi.spyOn(spotlightRepo, "markShown").mockResolvedValue(undefined);
    vi.spyOn(spotlightRepo, "selectLeastRecentlyShown").mockResolvedValue([]);

    const { getArtistSpotlights } = await import("../../src/services/plex/album-groups-service.js");
    await getArtistSpotlights({} as never, { serverUrl: "http://x", token: "t" }, "lib", 20);

    expect(markShown).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
