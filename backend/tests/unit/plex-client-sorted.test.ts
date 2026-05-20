import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlexConfig } from "../../src/services/plex/plex-client.js";
import * as plexClient from "../../src/services/plex/plex-client.js";

const config = { serverUrl: "http://plex.local", token: "tok" } as PlexConfig;

const albumXml = `<?xml version="1.0"?>
<MediaContainer totalSize="100">
  <Directory ratingKey="1" title="A" parentTitle="Artist" addedAt="1700000000"/>
</MediaContainer>`;

describe("fetchAlbumsSorted", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests type=9 with sort and container size", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(albumXml, { status: 200 }),
    );

    await plexClient.fetchAlbumsSorted(config, "lib-9", {
      sort: "addedAt:desc",
      start: 0,
      size: 20,
    });

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("/library/sections/lib-9/all");
    expect(url).toContain("type=9");
    expect(url).toContain("sort=addedAt%3Adesc");
    expect(url).toContain("X-Plex-Container-Start=0");
    expect(url).toContain("X-Plex-Container-Size=20");
  });
});
