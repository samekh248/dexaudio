import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";
import * as plexConn from "../../src/services/plex/plex-connection-service.js";
import * as albumGroupsService from "../../src/services/plex/album-groups-service.js";

const TEST_SECRET = "a".repeat(32);

describe("GET /library/albums/groups", () => {
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
      url: "/api/v1/library/albums/groups?libraryId=1",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns groups payload when connected", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue({
      serverUrl: "http://plex.local",
      token: "tok",
    });
    vi.spyOn(albumGroupsService, "getAlbumGroups").mockResolvedValue({
      recentlyPlayed: [],
      recentlyAdded: [],
      hiddenGems: [],
      randomPicks: [{ id: "1", title: "A", artist: "B" }],
      artistSpotlights: [],
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/library/albums/groups?libraryId=1",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.randomPicks).toHaveLength(1);
    expect(body).toHaveProperty("artistSpotlights");
  });
});
