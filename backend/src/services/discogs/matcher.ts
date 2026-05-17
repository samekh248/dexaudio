import type { Album } from "@dexaudio/shared-types";
import type { DiscogsRelease } from "./discogs-client.js";

export type MatchResult = {
  status: "matched" | "partial" | "not_on_plex";
  confidence: number;
  plexRatingKey: string | null;
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchRelease(
  release: DiscogsRelease,
  albums: Album[],
  strictness: "strict" | "fuzzy",
): MatchResult {
  const releaseTitle = normalize(release.title);
  const releaseArtist = normalize(release.artist);

  let best: MatchResult = { status: "not_on_plex", confidence: 0, plexRatingKey: null };

  for (const album of albums) {
    const albumTitle = normalize(album.title);
    const albumArtist = normalize(album.artist);

    if (strictness === "strict") {
      if (albumTitle === releaseTitle && albumArtist === releaseArtist) {
        return { status: "matched", confidence: 1, plexRatingKey: album.id };
      }
    } else {
      const titleScore = similarity(releaseTitle, albumTitle);
      const artistScore = similarity(releaseArtist, albumArtist);
      const score = titleScore * 0.6 + artistScore * 0.4;
      if (score > best.confidence) {
        best = {
          status: score >= 0.85 ? "matched" : score >= 0.6 ? "partial" : "not_on_plex",
          confidence: score,
          plexRatingKey: score >= 0.6 ? album.id : null,
        };
      }
    }
  }

  return best;
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  return 0;
}
