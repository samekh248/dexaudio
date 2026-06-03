import { describe, expect, it } from "vitest";
import {
  controlPath,
  playMediaPath,
  playQueuePath,
} from "../../src/services/plex/plex-remote-service.js";

describe("plex-remote-service", () => {
  it("builds playMedia path with rating key", () => {
    expect(decodeURIComponent(playMediaPath("12345"))).toContain("/library/metadata/12345");
    expect(playMediaPath("12345", 5000)).toContain("offset=5000");
  });

  it("builds playQueue path", () => {
    expect(playQueuePath("99")).toBe("/player/playback/playQueue?playQueueID=99");
  });

  it("maps control actions to paths", () => {
    expect(controlPath("pause")).toBe("/player/playback/pause");
    expect(controlPath("seek", 12000)).toContain("offset=12000");
  });
});
