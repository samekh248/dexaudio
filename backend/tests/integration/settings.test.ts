import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";

const TEST_SECRET = "b".repeat(32);

describe("settings routes", () => {
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

  afterAll(async () => app.close());

  it("GET /api/v1/settings returns defaults", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/settings" });
    expect(res.statusCode).toBe(200);
    expect(res.json().matchingStrictness).toBeDefined();
  });

  it("PATCH /api/v1/settings updates values", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/settings",
      payload: { autoQueueSimilar: false },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().autoQueueSimilar).toBe(false);
  });
});
