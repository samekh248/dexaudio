import type { Album } from "@dexaudio/shared-types";
import type { DiscogsRelease } from "./discogs-client.js";

export type MatchCandidate = {
  id: string;
  title: string;
  artist: string;
  score: number;
};

export type MatchResult = {
  status: "matched" | "partial" | "not_on_plex";
  confidence: number;
  plexRatingKey: string | null;
  candidates: MatchCandidate[];
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreAlbum(releaseTitle: string, releaseArtist: string, album: Album): number {
  const titleScore = similarity(releaseTitle, normalize(album.title));
  const artistScore = similarity(releaseArtist, normalize(album.artist));
  return titleScore * 0.6 + artistScore * 0.4;
}

export function matchRelease(
  release: DiscogsRelease,
  albums: Album[],
  strictness: "strict" | "fuzzy",
): MatchResult {
  const releaseTitle = normalize(release.title);
  const releaseArtist = normalize(release.artist);

  if (strictness === "strict") {
    for (const album of albums) {
      if (normalize(album.title) === releaseTitle && normalize(album.artist) === releaseArtist) {
        return {
          status: "matched",
          confidence: 1,
          plexRatingKey: album.id,
          candidates: [{ id: album.id, title: album.title, artist: album.artist, score: 1 }],
        };
      }
    }
    return { status: "not_on_plex", confidence: 0, plexRatingKey: null, candidates: [] };
  }

  const scored: MatchCandidate[] = [];
  for (const album of albums) {
    const score = scoreAlbum(releaseTitle, releaseArtist, album);
    if (score >= 0.6) {
      scored.push({ id: album.id, title: album.title, artist: album.artist, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const candidates = scored.slice(0, 3);

  if (candidates.length === 0) {
    return { status: "not_on_plex", confidence: 0, plexRatingKey: null, candidates: [] };
  }

  const best = candidates[0];
  const status =
    best.score >= 0.85 ? "matched" : best.score >= 0.6 ? "partial" : "not_on_plex";

  return {
    status,
    confidence: best.score,
    plexRatingKey: status === "not_on_plex" ? null : best.id,
    candidates,
  };
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  return 0;
}
