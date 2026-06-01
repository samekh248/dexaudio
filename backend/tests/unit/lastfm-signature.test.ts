import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signParams } from "../../src/services/lastfm/lastfm-signature.js";
import { submitScrobble } from "../../src/services/lastfm/lastfm-client.js";

function expectedSig(params: Record<string, string>, secret: string): string {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  return createHash("md5").update(`${base}${secret}`).digest("hex");
}

describe("lastfm signature", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("signs params sorted by name then appends the secret", () => {
    const params = { method: "auth.getSession", api_key: "KEY", token: "TOK" };
    expect(signParams(params, "SECRET")).toBe(expectedSig(params, "SECRET"));
  });

  it("excludes format, callback and api_sig from the signature", () => {
    const core = { method: "auth.getToken", api_key: "KEY" };
    const withExtras = { ...core, format: "json", callback: "cb", api_sig: "old" };
    expect(signParams(withExtras, "SECRET")).toBe(signParams(core, "SECRET"));
  });

  it("posts a signed scrobble and reports success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const ok = await submitScrobble("KEY", "SECRET", "SK", {
      track: "Song",
      artist: "Artist",
      album: "Album",
      playedAt: "2026-05-31T12:00:00.000Z",
    });

    expect(ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(init.body as URLSearchParams);
    expect(body.get("sk")).toBe("SK");
    expect(body.get("api_sig")).toBeTruthy();
    expect(body.get("api_sig")).toHaveLength(32);
  });

  it("reports failure when Last.fm returns an error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: 9 }) }),
    );
    const ok = await submitScrobble("KEY", "SECRET", "SK", {
      track: "Song",
      artist: "Artist",
      album: "Album",
      playedAt: "2026-05-31T12:00:00.000Z",
    });
    expect(ok).toBe(false);
  });
});
