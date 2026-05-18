import { describe, expect, it } from "vitest";
import { scrobbleDedupKey } from "@dexaudio/shared-types";

describe("scrobbleDedupKey", () => {
  it("is stable for the same play event", () => {
    const input = {
      playedAt: "2026-05-18T12:00:00.000Z",
      track: "Track",
      artist: "Artist",
      album: "Album",
    };
    expect(scrobbleDedupKey(input)).toBe(scrobbleDedupKey(input));
  });
});
