import { describe, expect, it } from "vitest";
import { matchRelease, normalize } from "../../src/services/discogs/matcher.js";

const albums = [
  { id: "plex-1", title: "OK Computer", artist: "Radiohead", year: 1997 },
  { id: "plex-2", title: "Kid A", artist: "Radiohead", year: 2000 },
];

describe("discogs-matcher", () => {
  it("normalizes strings", () => {
    expect(normalize("OK Computer!")).toBe("ok computer");
    expect(normalize("")).toBe("");
  });

  it("fuzzy uses substring similarity for partial titles", () => {
    const result = matchRelease(
      { id: 5, title: "Kid", artist: "Radiohead" },
      albums,
      "fuzzy",
    );
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("strict match requires exact title and artist", () => {
    const result = matchRelease(
      { id: 1, title: "OK Computer", artist: "Radiohead" },
      albums,
      "strict",
    );
    expect(result.status).toBe("matched");
    expect(result.plexRatingKey).toBe("plex-1");
  });

  it("returns not_on_plex when no match", () => {
    const result = matchRelease(
      { id: 2, title: "Unknown Album", artist: "Nobody" },
      albums,
      "strict",
    );
    expect(result.status).toBe("not_on_plex");
  });

  it("fuzzy match with low score stays not_on_plex", () => {
    const result = matchRelease(
      { id: 9, title: "Completely Different", artist: "Nobody" },
      albums,
      "fuzzy",
    );
    expect(result.status).toBe("not_on_plex");
  });

  it("fuzzy match finds partial matches", () => {
    const result = matchRelease(
      { id: 3, title: "Kid A (Special)", artist: "Radiohead" },
      albums,
      "fuzzy",
    );
    expect(["matched", "partial"]).toContain(result.status);
  });

  it("fuzzy partial match when title similar but not exact", () => {
    const result = matchRelease(
      { id: 4, title: "Kid A Deluxe", artist: "Radiohead" },
      albums,
      "fuzzy",
    );
    expect(result.confidence).toBeGreaterThan(0);
  });
});
