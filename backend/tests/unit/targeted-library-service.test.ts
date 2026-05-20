import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlexConfig } from "../../src/services/plex/plex-client.js";
import type { AlbumWithStats } from "../../src/services/plex/plex-client.js";
import * as plexClient from "../../src/services/plex/plex-client.js";
import * as libraryService from "../../src/services/plex/library-service.js";
import * as spotlightRepo from "../../src/services/plex/artist-spotlight-repo.js";
import {
  selectHiddenGems,
  selectRecentlyPlayed,
} from "../../src/services/plex/album-groups-service.js";
import * as targeted from "../../src/services/plex/targeted-library-service.js";

const config = { serverUrl: "http://plex.local", token: "tok" } as PlexConfig;

function album(
  partial: Partial<AlbumWithStats> & Pick<AlbumWithStats, "id" | "title" | "artist">,
): AlbumWithStats {
  return {
    id: partial.id,
    title: partial.title,
    artist: partial.artist,
    year: partial.year,
    artUrl: partial.artUrl,
    userRating: partial.userRating,
    addedAt: partial.addedAt,
    artistId: partial.artistId,
    lastPlayedAt: partial.lastPlayedAt,
    playCount30d: partial.playCount30d,
  };
}

describe("targeted-library-service", () => {
  afterEach(() => {
    targeted.clearProfileCache();
    vi.restoreAllMocks();
  });

  it("recently-added uses one fetchAlbumsSorted with addedAt:desc and size 20", async () => {
    const sorted = vi.spyOn(plexClient, "fetchAlbumsSorted").mockResolvedValue({
      items: [album({ id: "1", title: "New", artist: "A", addedAt: "2026-05-01T00:00:00.000Z" })],
      total: 1,
    });

    await targeted.loadRecentlyAddedProfile(config, "lib-1");

    expect(sorted).toHaveBeenCalledTimes(1);
    expect(sorted).toHaveBeenCalledWith(config, "lib-1", {
      sort: "addedAt:desc",
      start: 0,
      size: targeted.GROUP_FETCH_SIZE,
    });
  });

  it("sliceItems respects clampGroupLimit", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(targeted.sliceItems(items, 10)).toHaveLength(10);
    expect(targeted.sliceItems(items, 20)).toHaveLength(20);
  });

  it("recently-played uses lastViewedAt sort plus bounded play counts", async () => {
    const now = new Date("2026-05-19T12:00:00Z").getTime();
    vi.spyOn(plexClient, "fetchAlbumPlayCounts30dBounded").mockResolvedValue(
      new Map([
        ["1", 1],
        ["2", 5],
      ]),
    );
    vi.spyOn(plexClient, "fetchAlbumsSorted").mockResolvedValue({
      items: [
        album({ id: "2", title: "B", artist: "X", lastPlayedAt: new Date(now) }),
        album({ id: "1", title: "A", artist: "X", lastPlayedAt: new Date(now) }),
      ],
      total: 2,
    });
    const metadataBatch = vi.spyOn(plexClient, "fetchAlbumMetadataBatch");
    const fullPlayCounts = vi.spyOn(libraryService, "getAlbumPlayCounts30d");

    const result = await targeted.loadRecentlyPlayedProfile(config, "lib-1");
    expect(result.map((a) => a.id)).toEqual(["2", "1"]);
    expect(plexClient.fetchAlbumsSorted).toHaveBeenCalledWith(config, "lib-1", {
      sort: "lastViewedAt:desc",
      start: 0,
      size: targeted.RECENTLY_PLAYED_SORT_SIZE,
    });
    expect(fullPlayCounts).not.toHaveBeenCalled();
    expect(metadataBatch).not.toHaveBeenCalled();
  });

  it("recently-played fetches metadata only for top plays missing from sorted page", async () => {
    const now = new Date("2026-05-19T12:00:00Z").getTime();
    vi.spyOn(plexClient, "fetchAlbumPlayCounts30dBounded").mockResolvedValue(
      new Map([["99", 10]]),
    );
    vi.spyOn(plexClient, "fetchAlbumsSorted").mockResolvedValue({ items: [], total: 0 });
    const metadataBatch = vi
      .spyOn(plexClient, "fetchAlbumMetadataBatch")
      .mockResolvedValue([
        album({ id: "99", title: "Hot", artist: "X", lastPlayedAt: new Date(now) }),
      ]);

    const result = await targeted.loadRecentlyPlayedProfile(config, "lib-1");
    expect(metadataBatch).toHaveBeenCalledWith(config, ["99"]);
    expect(result.map((a) => a.id)).toEqual(["99"]);
  });

  it("hidden-gems filters rating and neglect from sorted pull", async () => {
    const neglectBefore = Date.now() - 90 * 24 * 60 * 60 * 1000;
    vi.spyOn(plexClient, "fetchAlbumsSorted").mockResolvedValue({
      items: [
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
          lastPlayedAt: new Date(),
        }),
      ],
      total: 2,
    });

    const result = await targeted.loadHiddenGemsProfile(config, "lib-1");
    expect(result.map((a) => a.id)).toEqual(["gem"]);
    expect(selectHiddenGems(result, 20).map((a) => a.id)).toEqual(["gem"]);
  });

  it("random-picks builds bounded pool and returns up to 20", async () => {
    const recent = Array.from({ length: 5 }, (_, i) =>
      album({ id: `r${i}`, title: `R${i}`, artist: "A" }),
    );
    const alpha = Array.from({ length: 5 }, (_, i) =>
      album({ id: `a${i}`, title: `A${i}`, artist: "A" }),
    );
    vi.spyOn(plexClient, "fetchAlbumsSorted")
      .mockResolvedValueOnce({ items: recent, total: 5 })
      .mockResolvedValue({ items: alpha, total: 5 });

    const first = await targeted.loadRandomPicksProfile(config, "lib-1");
    expect(first.length).toBeLessThanOrEqual(20);
    targeted.clearProfileCache();
    const second = await targeted.loadRandomPicksProfile(config, "lib-1");
    expect(second.length).toBeLessThanOrEqual(20);
  });

  it("falls back to paginated fetchAlbums when sorted fetch returns empty", async () => {
    vi.spyOn(plexClient, "fetchAlbumsSorted").mockResolvedValue({ items: [], total: 0 });
    const paginated = vi.spyOn(plexClient, "fetchAlbums").mockResolvedValue({
      items: [album({ id: "1", title: "A", artist: "X", addedAt: "2026-01-01T00:00:00.000Z" })],
      total: 1,
    });

    await targeted.loadRecentlyAddedProfile(config, "lib-1");
    expect(paginated).toHaveBeenCalled();
  });

  it("artist spotlights fetches albums only for selected artists, not entire catalog", async () => {
    const artists = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      title: `Artist ${i}`,
      childCount: 5,
    }));
    vi.spyOn(plexClient, "fetchArtistsPage").mockResolvedValue({
      items: artists,
      total: artists.length,
    });
    vi.spyOn(spotlightRepo, "selectLeastRecentlyShown").mockResolvedValue(["1", "2", "3"]);
    vi.spyOn(spotlightRepo, "markShown").mockResolvedValue(undefined);
    const fetchArtistAlbums = vi.spyOn(plexClient, "fetchArtistAlbums").mockResolvedValue([
      album({ id: "a1", title: "A1", artist: "X", artistId: "1" }),
      album({ id: "a2", title: "A2", artist: "X", artistId: "1" }),
      album({ id: "a3", title: "A3", artist: "X", artistId: "1" }),
    ]);

    await targeted.loadArtistSpotlightsProfile({} as never, config, "lib-1", 10);

    expect(fetchArtistAlbums.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it("cache serves limit 10 and 20 from same key within TTL", async () => {
    vi.spyOn(plexClient, "fetchAlbumsSorted").mockResolvedValue({
      items: Array.from({ length: 20 }, (_, i) =>
        album({
          id: String(i),
          title: `T${i}`,
          artist: "A",
          addedAt: new Date(2026, 0, i + 1).toISOString(),
        }),
      ),
      total: 20,
    });

    const ten = await targeted.getProfileAlbums("recently-added", config, "lib-1", 10);
    const twenty = await targeted.getProfileAlbums("recently-added", config, "lib-1", 20);
    expect(ten).toHaveLength(10);
    expect(twenty).toHaveLength(20);
    expect(plexClient.fetchAlbumsSorted).toHaveBeenCalledTimes(1);
  });
});
