import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../src/lib/errors.js";
import * as plexConn from "../../src/services/plex/plex-connection-service.js";
import * as trackWaveformService from "../../src/services/plex/track-waveform-service.js";

const TEST_SECRET = "a".repeat(32);

describe("GET /library/tracks/:trackId/waveform", () => {
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

  it("returns 401 when Plex is not connected", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue(null);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/library/tracks/42/waveform",
    });
    expect(res.statusCode).toBe(401);
    const body = res.json() as { code?: string };
    expect(body.code).toBe("plex_not_connected");
  });

  it("returns 404 waveform_unavailable when service has no data", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue({
      serverUrl: "http://plex.local",
      token: "tok",
    });
    vi.spyOn(trackWaveformService, "getTrackWaveform").mockRejectedValue(
      new AppError("Waveform unavailable", 404, "waveform_unavailable"),
    );

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/library/tracks/42/waveform",
    });
    expect(res.statusCode).toBe(404);
    expect((res.json() as { code?: string }).code).toBe("waveform_unavailable");
  });

  it("returns normalized waveform payload", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue({
      serverUrl: "http://plex.local",
      token: "tok",
    });
    vi.spyOn(trackWaveformService, "getTrackWaveform").mockResolvedValue({
      trackId: "42",
      samples: [0.1, 0.5, 0.9],
      sampleIntervalMs: 100,
      durationMs: 240000,
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/library/tracks/42/waveform?subsample=128",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { samples: number[]; durationMs: number };
    expect(body.samples).toHaveLength(3);
    expect(body.durationMs).toBe(240000);
  });

  it("rejects invalid subsample", async () => {
    vi.spyOn(plexConn, "getPlexConfig").mockResolvedValue({
      serverUrl: "http://plex.local",
      token: "tok",
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/library/tracks/42/waveform?subsample=0",
    });
    expect(res.statusCode).toBe(400);
  });
});
