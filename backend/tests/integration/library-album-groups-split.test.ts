import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";
import * as plexConn from "../../src/services/plex/plex-connection-service.js";
import * as albumGroupsService from "../../src/services/plex/album-groups-service.js";

const TEST_SECRET = "a".repeat(32);

const mockConfig = { serverUrl: "http://plex.local", token: "tok" };

describe("GET /library/albums/groups/*", () => {
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
    vi.restoreAllMocks();
  });

  it("returns 404 when Plex is not connected", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue(null);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/library/albums/groups/recently-added?libraryId=1",
    });
    expect(res.statusCode).toBe(404);
  });

  const groupCases = [
    ["recently-played", "getRecentlyPlayed"],
    ["recently-added", "getRecentlyAdded"],
    ["hidden-gems", "getHiddenGems"],
    ["random-picks", "getRandomPicks"],
    ["artist-spotlights", "getArtistSpotlights"],
  ] as const;

  it.each(groupCases)("returns items for %s", async (segment, fn) => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue(mockConfig);
    vi.spyOn(albumGroupsService, fn).mockResolvedValue({
      items: [{ id: "1", title: "A", artist: "B" }],
    } as never);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/library/albums/groups/${segment}?libraryId=1&limit=10`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: [{ id: "1", title: "A", artist: "B" }] });
  });
});
