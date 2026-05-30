import { describe, expect, it } from "vitest";
import {
  buildTimelineSearchParams,
  timelineRequestHeaders,
} from "../../src/services/plex/plex-timeline-service.js";
import { PLEX_PRODUCT_NAME } from "../../src/lib/config.js";

describe("plex-timeline-service", () => {
  it("builds timeline query params for a track", () => {
    const params = buildTimelineSearchParams({
      ratingKey: "12345",
      state: "playing",
      timeMs: 42000,
      durationMs: 217000,
      sessionKey: 99,
    });
    expect(params.get("ratingKey")).toBe("12345");
    expect(params.get("key")).toBe("/library/metadata/12345");
    expect(params.get("state")).toBe("playing");
    expect(params.get("time")).toBe("42000");
    expect(params.get("duration")).toBe("217000");
    expect(params.get("sessionKey")).toBe("99");
    expect(params.get("identifier")).toBe("com.plexapp.plugins.library");
  });

  it("uses DexAudio product headers", () => {
    const headers = timelineRequestHeaders("test-token");
    expect(headers["X-Plex-Product"]).toBe(PLEX_PRODUCT_NAME);
    expect(headers["X-Plex-Device-Name"]).toBe("DexAudio");
    expect(headers["X-Plex-Token"]).toBe("test-token");
  });
});
