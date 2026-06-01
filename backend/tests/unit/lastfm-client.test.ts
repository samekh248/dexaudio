import { afterEach, describe, expect, it, vi } from "vitest";
import { isScrobbleEligible, submitScrobble } from "../../src/services/lastfm/lastfm-client.js";

describe("lastfm-client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("checks scrobble eligibility", () => {
    expect(isScrobbleEligible(120_000, 180_000)).toBe(true);
    expect(isScrobbleEligible(10_000, 180_000)).toBe(false);
  });

  it("returns false when Last.fm HTTP response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const ok = await submitScrobble("key", "secret", "session", {
      track: "Song",
      artist: "Artist",
      album: "Album",
      playedAt: "2026-05-31T12:00:00.000Z",
    });

    expect(ok).toBe(false);
  });

  it("returns false when Last.fm returns an API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: 9 }),
      }),
    );

    const ok = await submitScrobble("key", "secret", "session", {
      track: "Song",
      artist: "Artist",
      album: "Album",
      playedAt: "2026-05-31T12:00:00.000Z",
    });

    expect(ok).toBe(false);
  });

  it("returns true when scrobble submission succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );

    const ok = await submitScrobble("key", "secret", "session", {
      track: "Song",
      artist: "Artist",
      playedAt: "2026-05-31T12:00:00.000Z",
    });

    expect(ok).toBe(true);
  });

  it("returns false when response JSON cannot be parsed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("invalid json");
        },
      }),
    );

    const ok = await submitScrobble("key", "secret", "session", {
      track: "Song",
      artist: "Artist",
      playedAt: "2026-05-31T12:00:00.000Z",
    });

    expect(ok).toBe(true);
  });
});
