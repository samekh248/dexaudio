import { describe, expect, it } from "vitest";
import { isScrobbleEligible, scrobbleExpiresAt } from "@/lib/scrobble-threshold";

describe("scrobble threshold", () => {
  it("requires half duration for short tracks", () => {
    expect(isScrobbleEligible(90_000, 180_000)).toBe(true);
    expect(isScrobbleEligible(80_000, 180_000)).toBe(false);
  });

  it("caps threshold at 4 minutes for long tracks", () => {
    expect(isScrobbleEligible(240_000, 600_000)).toBe(true);
    expect(isScrobbleEligible(200_000, 600_000)).toBe(false);
  });

  it("expires after 24 hours", () => {
    const start = Date.now();
    expect(scrobbleExpiresAt(start)).toBe(start + 24 * 60 * 60 * 1000);
  });
});
