import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";
import * as plexConn from "../../src/services/plex/plex-connection-service.js";
import * as plexClient from "../../src/services/plex/plex-client.js";
import * as libraryService from "../../src/services/plex/library-service.js";
import * as targeted from "../../src/services/plex/targeted-library-service.js";

const TEST_SECRET = "a".repeat(32);
const mockConfig = { serverUrl: "http://plex.local", token: "tok" };

function albumXml(count: number, totalSize?: number, startId = 1): string {
  const dirs = Array.from({ length: count }, (_, i) => {
    const id = startId + i;
    return `<Directory ratingKey="${id}" title="Album ${id}" parentTitle="Artist" addedAt="1700000000"/>`;
  }).join("");
  const total = totalSize ?? count;
  return `<?xml version="1.0"?><MediaContainer totalSize="${total}">${dirs}</MediaContainer>`;
}

describe("library targeted groups", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? "postgresql://dexaudio:dexaudio@localhost:5432/dexaudio";
    process.env.APP_SECRET = TEST_SECRET;
    app = await buildApp({
      DATABASE_URL: process.env.DATABASE_URL,
      APP_SECRET: TEST_SECRET,
      PORT: 3001,
      GRAPHQL_ENABLED: false,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    targeted.clearProfileCache();
    libraryService.clearAlbumCache();
    vi.restoreAllMocks();
  });

  it("five parallel group handlers do not call fetchAllAlbums on cold load", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue(mockConfig);
    const fetchAll = vi.spyOn(plexClient, "fetchAllAlbums");
    vi.spyOn(plexClient, "fetchAlbumsSorted").mockResolvedValue({
      items: [{ id: "1", title: "A", artist: "X", addedAt: "2026-05-01T00:00:00.000Z" }],
      total: 1,
    });
    vi.spyOn(plexClient, "fetchAlbumPlayCounts30dBounded").mockResolvedValue(new Map([["1", 2]]));
    vi.spyOn(plexClient, "fetchAlbumMetadataBatch").mockResolvedValue([]);
    vi.spyOn(plexClient, "fetchArtistsPage").mockResolvedValue({ items: [], total: 0 });

    const segments = [
      "recently-played",
      "recently-added",
      "hidden-gems",
      "random-picks",
      "artist-spotlights",
    ];

    await Promise.all(
      segments.map((segment) =>
        app.inject({
          method: "GET",
          url: `/api/v1/library/albums/groups/${segment}?libraryId=1&limit=10`,
        }),
      ),
    );

    expect(fetchAll).not.toHaveBeenCalled();
  });

  it("GET /library/albums paginated path uses fetchAlbums not profile loaders", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue(mockConfig);
    const fetchAlbums = vi.spyOn(plexClient, "fetchAlbums").mockResolvedValue({
      items: [{ id: "1", title: "A", artist: "X" }],
      total: 1,
    });
    const sorted = vi.spyOn(plexClient, "fetchAlbumsSorted");

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/library/albums?libraryId=1&page=1&pageSize=50",
    });

    expect(res.statusCode).toBe(200);
    expect(fetchAlbums).toHaveBeenCalled();
    expect(sorted).not.toHaveBeenCalled();
  });

  it("legacy GET /library/albums/groups does not call fetchAllAlbums when profiles are mocked", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue(mockConfig);
    const fetchAll = vi.spyOn(plexClient, "fetchAllAlbums");
    vi.spyOn(targeted, "getProfileAlbums").mockResolvedValue([]);
    vi.spyOn(targeted, "loadArtistSpotlightsProfile").mockResolvedValue([]);

    const { getAlbumGroups } = await import("../../src/services/plex/album-groups-service.js");
    await getAlbumGroups({} as never, mockConfig, "1");

    expect(fetchAll).not.toHaveBeenCalled();
  });

  it("cold home load parses fewer album directories than full-catalog baseline", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue(mockConfig);

    let parsedDirs = 0;
    const respond = (body: string, countDirs = true) => {
      if (countDirs) {
        parsedDirs += body.match(/<Directory\b/g)?.length ?? 0;
      }
      return new Response(body, { status: 200 });
    };

    const catalogTotal = 10_000;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("type=9") && !url.includes("sort=")) {
        return respond(albumXml(500, catalogTotal));
      }
      if (url.includes("sort=addedAt")) {
        return respond(albumXml(20));
      }
      if (url.includes("sort=userRating")) {
        return respond(albumXml(100));
      }
      if (url.includes("sort=titleSort")) {
        return respond(albumXml(100));
      }
      if (url.includes("sort=lastViewedAt")) {
        return respond(albumXml(50));
      }
      if (url.includes("type=10")) {
        return respond(`<?xml version="1.0"?><MediaContainer totalSize="0"></MediaContainer>`);
      }
      if (url.includes("type=8")) {
        return respond(`<?xml version="1.0"?><MediaContainer totalSize="0"></MediaContainer>`);
      }
      if (url.includes("/library/metadata/")) {
        return respond(albumXml(1), false);
      }
      return new Response("", { status: 404 });
    });

    parsedDirs = 0;
    await plexClient.fetchAllAlbums(mockConfig, "1", 500);
    const baseline = parsedDirs;

    parsedDirs = 0;
    targeted.clearProfileCache();
    await Promise.all(
      ["recently-played", "recently-added", "hidden-gems", "random-picks"].map((segment) =>
        app.inject({
          method: "GET",
          url: `/api/v1/library/albums/groups/${segment}?libraryId=1&limit=10`,
        }),
      ),
    );
    const targetedCount = parsedDirs;

    expect(baseline).toBeGreaterThan(0);
    expect(targetedCount).toBeLessThan(baseline * 0.5);
  });
});
