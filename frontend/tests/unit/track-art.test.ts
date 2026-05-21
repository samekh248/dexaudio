import { describe, expect, it } from "vitest";
import { trackArtSrc } from "@/lib/track-art";

describe("trackArtSrc", () => {
  it("prefers proxied artUrl over generic album thumb", () => {
    const proxied =
      "/api/v1/plex/photo?path=%2Flibrary%2Fmetadata%2F50%2Fthumb%2F1";
    expect(
      trackArtSrc({
        albumId: "50",
        artUrl: proxied,
      }),
    ).toBe(proxied);
  });

  it("proxies absolute Plex art paths from track metadata", () => {
    expect(
      trackArtSrc({
        albumId: "50",
        artUrl: "/library/metadata/50/thumb/subdir/cover.jpg",
      }),
    ).toBe(
      "/api/v1/plex/photo?path=%2Flibrary%2Fmetadata%2F50%2Fthumb%2Fsubdir%2Fcover.jpg",
    );
  });

  it("falls back to album thumb when artUrl is missing", () => {
    expect(trackArtSrc({ albumId: "50" })).toBe(
      "/api/v1/plex/photo?path=%2Flibrary%2Fmetadata%2F50%2Fthumb",
    );
  });
});
