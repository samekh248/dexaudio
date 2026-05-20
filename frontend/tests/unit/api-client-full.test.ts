import { describe, it, vi, beforeEach } from "vitest";
import { api } from "@/services/api-client";

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: async () => body,
  });
}

describe("api client methods", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("covers plex and library endpoints", async () => {
    vi.stubGlobal("fetch", mockFetch({ connected: true }));
    await api.getPlexConnection();
    await api.savePlexConnection({ serverUrl: "http://x", token: "t" });
    await api.getLibraries();
    await api.createPlexPin();
    await api.getPlexPinStatus(123);
    await api.getPlexAuthServers();
    await api.getPlexAuthServerLibraries("machine-1");
    await api.completePlexAuth({
      machineIdentifier: "machine-1",
      libraryIds: ["lib1"],
    });
    await api.getPlexAccount();

    vi.stubGlobal("fetch", mockFetch({ items: [], total: 0, page: 1 }));
    await api.getAlbums("lib1");
    await api.getAlbumGroups("lib1");
    await api.getAllAlbums("lib1");
    await api.getAlbumTracks("a1");
    await api.getArtistAlbums("ar1");
    await api.search("query");
    await api.getSimilarTracks("t1");
  });

  it("covers stats settings discogs lastfm", async () => {
    vi.stubGlobal("fetch", mockFetch({ songs: [], albums: [], artists: [] }));
    await api.getTopStats();

    vi.stubGlobal("fetch", mockFetch({ matchingStrictness: "fuzzy" }));
    await api.getSettings();
    await api.patchSettings({ autoQueueSimilar: true });

    vi.stubGlobal("fetch", mockFetch({ ok: true }));
    await api.saveDiscogsConnection("u", "t");
    await api.syncDiscogs();
    await api.getDiscogsCollection("matched");
    await api.getDiscogsCollection();
    await api.patchDiscogsMatch(42, { plexAlbumId: "album-1", status: "matched" });
    await api.submitScrobble({
      track: "T",
      artist: "A",
      album: "B",
      playedAt: new Date().toISOString(),
    });
    await api.retryScrobbles();
  });

  it("handles 204 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 204, statusText: "No Content" }),
    );
    // no endpoint returns 204 in client currently - health still works
    await api.health();
  });
});
