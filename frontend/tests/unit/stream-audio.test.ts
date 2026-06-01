import { describe, expect, it } from "vitest";
import { howlerFormatsForTrack, shouldAttemptLossless, streamUrlForTrack } from "@/lib/stream-audio";
import type { Track } from "@dexaudio/shared-types";

describe("stream-audio", () => {
  it("builds same-origin stream URLs for Howler", () => {
    expect(streamUrlForTrack("12345")).toBe("/api/v1/stream/12345");
    expect(streamUrlForTrack("12345", { lossless: true })).toBe(
      "/api/v1/stream/12345?quality=lossless",
    );
  });

  it("maps track formats to Howler hints", () => {
    expect(howlerFormatsForTrack("mp3")).toEqual(["mp3", "mpeg"]);
    expect(howlerFormatsForTrack("flac", { lossless: true })).toEqual(["flac"]);
  });

  it("requests lossless for flac and unknown formats when enabled", () => {
    const flacTrack = {
      id: "1",
      title: "T",
      artist: "A",
      album: "B",
      durationMs: 1000,
      format: "flac",
    } satisfies Track;
    const mp3Track = { ...flacTrack, format: "mp3" as const };
    const unknownTrack = { ...flacTrack, format: "unsupported" as const };

    expect(shouldAttemptLossless(mp3Track)).toBe(false);
    expect(shouldAttemptLossless(flacTrack, true)).toBe(false);
    expect(shouldAttemptLossless(flacTrack)).toBe(true);
    expect(shouldAttemptLossless(unknownTrack)).toBe(true);
  });
});
