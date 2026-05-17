import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";

const TEST_SECRET = "d".repeat(32);

describe("discogs routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://dexaudio:dexaudio@localhost:5432/dexaudio",
      APP_SECRET: TEST_SECRET,
      PORT: 3001,
      GRAPHQL_ENABLED: false,
    });
  });

  afterAll(async () => app.close());

  it("GET /api/v1/discogs/collection returns array", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/discogs/collection" });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});
