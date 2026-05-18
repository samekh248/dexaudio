import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";
import { resetAuthStateForTests } from "../../src/services/plex/plex-auth-service.js";

const TEST_SECRET = "a".repeat(32);

describe("plex auth routes", () => {
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
    resetAuthStateForTests();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/v1/plex/auth/pin returns pin payload or 502 when offline", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/plex/auth/pin" });
    expect([200, 502]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      const body = res.json();
      expect(body.pinId).toBeTypeOf("number");
      expect(body.pinCode).toBeTypeOf("string");
      expect(body.authUrl).toContain("app.plex.tv");
    }
  });

  it("GET /api/v1/plex/auth/servers without auth returns 401", async () => {
    resetAuthStateForTests();
    const res = await app.inject({ method: "GET", url: "/api/v1/plex/auth/servers" });
    expect(res.statusCode).toBe(401);
  });
});
