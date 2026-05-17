import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";

const TEST_SECRET = "a".repeat(32);

describe("plex connection routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://dexaudio:dexaudio@localhost:5432/dexaudio";
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

  it("GET /api/v1/health returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("GET /api/v1/plex/connection when not connected", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/plex/connection" });
    expect(res.statusCode).toBe(200);
    expect(res.json().connected).toBe(false);
  });
});
