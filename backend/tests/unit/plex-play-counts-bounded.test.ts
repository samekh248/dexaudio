import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlexConfig } from "../../src/services/plex/plex-client.js";
import * as plexClient from "../../src/services/plex/plex-client.js";

const config = { serverUrl: "http://plex.local", token: "tok" } as PlexConfig;

function trackPage(trackCount: number, totalSize: number): string {
  const tracks = Array.from({ length: trackCount }, (_, i) => {
    const albumKey = Math.floor(i / 2);
    return `<Track parentRatingKey="${albumKey}" viewCount="1"/>`;
  }).join("");
  return `<?xml version="1.0"?><MediaContainer totalSize="${totalSize}">${tracks}</MediaContainer>`;
}

describe("fetchAlbumPlayCounts30dBounded", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stops after maxPages even when more tracks exist", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const start = Number(new URL(url).searchParams.get("X-Plex-Container-Start") ?? 0);
      return new Response(trackPage(500, 5000), {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      });
    });

    await plexClient.fetchAlbumPlayCounts30dBounded(config, "lib-1", {
      maxPages: 2,
      stopWhenAlbums: 500,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
