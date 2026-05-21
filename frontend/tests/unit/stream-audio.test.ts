import { describe, expect, it } from "vitest";
import { howlerFormatsForTrack, streamUrlForTrack } from "@/lib/stream-audio";

describe("stream-audio", () => {
  it("builds same-origin stream URLs for Howler", () => {
    expect(streamUrlForTrack("12345")).toBe("/api/v1/stream/12345");
  });

  it("maps track formats to Howler hints", () => {
    expect(howlerFormatsForTrack("mp3")).toEqual(["mp3", "mpeg"]);
  });
});
