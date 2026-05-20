import { describe, expect, it, vi, afterEach } from "vitest";
import type { PlexConfig } from "../../src/services/plex/plex-client.js";
import * as plexClient from "../../src/services/plex/plex-client.js";
import * as libraryService from "../../src/services/plex/library-service.js";

const config = { serverUrl: "http://plex", token: "t" } as PlexConfig;

describe("library-service in-flight deduplication", () => {
  afterEach(() => {
    libraryService.clearAlbumCache();
    vi.restoreAllMocks();
  });

  it("fetches all albums once when called concurrently", async () => {
    const fetch = vi.spyOn(plexClient, "fetchAllAlbums").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([{ id: "1", title: "A", artist: "X" }]), 20);
        }),
    );

    const [a, b] = await Promise.all([
      libraryService.getAllAlbumsWithStats(config, "lib-1"),
      libraryService.getAllAlbumsWithStats(config, "lib-1"),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it("fetches 30-day play counts once when called concurrently", async () => {
    const fetch = vi.spyOn(plexClient, "fetchAlbumPlayCounts30d").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(new Map([["1", 3]])), 20);
        }),
    );

    const [a, b] = await Promise.all([
      libraryService.getAlbumPlayCounts30d(config, "lib-1"),
      libraryService.getAlbumPlayCounts30d(config, "lib-1"),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });
});
