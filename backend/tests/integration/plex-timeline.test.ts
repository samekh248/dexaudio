import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";

const TEST_SECRET = "a".repeat(32);

describe("plex timeline routes", () => {
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

  it("POST /api/v1/plex/timeline returns 401 or 204 when Plex cannot report", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/plex/timeline",
      payload: {
        ratingKey: "100",
        state: "playing",
        timeMs: 0,
        durationMs: 180000,
        sessionKey: 1,
      },
    });
    expect([401, 204, 202]).toContain(res.statusCode);
  });

  it("GET /api/v1/plex/reporting/status returns enabled flag when disconnected", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/plex/reporting/status" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { connected: boolean; enabled: boolean; pending: number };
    expect(body.enabled).toBe(true);
    expect(typeof body.pending).toBe("number");
  });
});
