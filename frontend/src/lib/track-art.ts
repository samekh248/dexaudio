import type { Track } from "@dexaudio/shared-types";

function proxyPlexPath(plexPath: string): string {
  return `/api/v1/plex/photo?path=${encodeURIComponent(plexPath)}`;
}

/** Browser URL for a track's album art via the Plex photo proxy. */
export function trackArtSrc(track: Pick<Track, "artUrl" | "albumId">): string | undefined {
  if (track.artUrl) {
    if (track.artUrl.startsWith("/api/v1/plex/photo?path=") || track.artUrl.startsWith("/api/")) {
      return track.artUrl;
    }
    if (track.artUrl.startsWith("/")) {
      return proxyPlexPath(track.artUrl);
    }
  }

  if (track.albumId) {
    return proxyPlexPath(`/library/metadata/${track.albumId}/thumb`);
  }

  return undefined;
}
