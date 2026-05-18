import { describe, expect, it } from "vitest";
import { isScrobbleEligible } from "../../src/services/lastfm/lastfm-client.js";

describe("lastfm-client", () => {
  it("checks scrobble eligibility", () => {
    expect(isScrobbleEligible(120_000, 180_000)).toBe(true);
    expect(isScrobbleEligible(10_000, 180_000)).toBe(false);
  });
});
