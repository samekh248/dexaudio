import { describe, expect, it } from "vitest";
import * as plexTv from "../../src/services/plex/plex-tv-client.js";

describe("plex-tv-client", () => {
  it("selectBestConnection prefers local non-relay", () => {
    const best = plexTv.selectBestConnection([
      { protocol: "http", address: "1.1.1.1", port: 32400, uri: "http://relay", local: false, relay: true },
      { protocol: "https", address: "192.168.1.1", port: 32400, uri: "https://local", local: true, relay: false },
    ]);
    expect(best?.uri).toBe("https://local");
  });

  it("buildAuthUrl includes client id and pin code", () => {
    const url = plexTv.buildAuthUrl("ABCD");
    expect(url).toContain("clientID=");
    expect(url).toContain("code=ABCD");
    expect(url.startsWith("https://app.plex.tv/auth")).toBe(true);
  });

  it("isServerResource detects server capability", () => {
    expect(
      plexTv.isServerResource({
        name: "Home",
        clientIdentifier: "x",
        owned: true,
        presence: true,
        provides: "server,player",
        connections: [],
      }),
    ).toBe(true);
    expect(
      plexTv.isServerResource({
        name: "Phone",
        clientIdentifier: "y",
        owned: true,
        presence: true,
        provides: "player",
        connections: [],
      }),
    ).toBe(false);
  });
});
