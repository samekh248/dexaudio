import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";
import * as plexConn from "../../src/services/plex/plex-connection-service.js";
import * as albumListService from "../../src/services/plex/album-list-service.js";

const TEST_SECRET = "a".repeat(32);

describe("GET /library/albums/all", () => {
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
      url: "/api/v1/library/albums/all?libraryId=1",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns sorted album list with cache header", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue({
      serverUrl: "http://plex.local",
      token: "tok",
    });
    vi.spyOn(albumListService, "getAllAlbums").mockResolvedValue({
      items: [
        { id: "1", title: "Abbey Road", artist: "Beatles", sortKey: "abbey road" },
        { id: "2", title: "The Wall", artist: "Pink Floyd", sortKey: "wall" },
      ],
      total: 2,
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/library/albums/all?libraryId=1",
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toContain("max-age=60");
    expect(res.json().total).toBe(2);
  });
});
