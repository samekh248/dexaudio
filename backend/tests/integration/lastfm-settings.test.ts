import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";

const TEST_SECRET = "c".repeat(32);

describe("lastfm settings routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.APP_SECRET = TEST_SECRET;
    app = await buildApp({
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://dexaudio:dexaudio@localhost:5432/dexaudio",
      APP_SECRET: TEST_SECRET,
      PORT: 3001,
      GRAPHQL_ENABLED: false,
    });
  });

  afterAll(async () => app.close());

  it("POST scrobble queues item", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/lastfm/scrobbles",
      payload: {
        track: "Test",
        artist: "Artist",
        album: "Album",
        playedAt: new Date().toISOString(),
      },
    });
    expect([201, 202]).toContain(res.statusCode);
  });

  it("POST retry returns pending count", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/lastfm/scrobbles/retry",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("retry_initiated");
  });
});
