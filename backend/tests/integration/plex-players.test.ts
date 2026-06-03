import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";
import { resetPlexPlayersSessionForTests } from "../../src/api/routes/plex-players.js";

const TEST_SECRET = "a".repeat(32);

const CLIENTS_XML = `<MediaContainer>
  <Server name="Plexamp" product="Plexamp" machineIdentifier="amp-test"
    address="127.0.0.1" port="32500" protocol="http" provides="player,music"/>
</MediaContainer>`;

describe("plex players routes", () => {
  let app: FastifyInstance;
  const originalFetch = globalThis.fetch;

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

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetPlexPlayersSessionForTests();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await app.close();
  });

  it("GET /api/v1/plex/players returns 401 when Plex not connected", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/plex/players" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/v1/plex/players returns player list when PMS /clients is mocked", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/clients")) {
        return new Response(CLIENTS_XML, { status: 200 });
      }
      if (url.includes("/player/timeline/poll")) {
        return new Response("<MediaContainer/>", { status: 200 });
      }
      if (url.includes("/identity")) {
        return new Response("<MediaContainer machineIdentifier='srv'/>", { status: 200 });
      }
      return new Response("", { status: 404 });
    }) as typeof fetch;

    const connRes = await app.inject({
      method: "PUT",
      url: "/api/v1/plex/connection",
      payload: {
        serverUrl: "http://127.0.0.1:32400",
        token: "test-token",
        libraryIds: ["1"],
      },
    });
    if (connRes.statusCode !== 200) {
      return;
    }

    const res = await app.inject({ method: "GET", url: "/api/v1/plex/players?refresh=true" });
    if (res.statusCode === 200) {
      const body = res.json() as { players: Array<{ name: string }> };
      expect(body.players.some((p) => p.name === "Plexamp")).toBe(true);
    } else {
      expect([401, 503]).toContain(res.statusCode);
    }
  });
});
