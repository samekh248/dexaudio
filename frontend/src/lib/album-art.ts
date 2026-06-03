/** Browser URL for album cover art via the Plex photo proxy. */
export function albumArtSrc(artUrl: string | undefined): string | undefined {
  if (!artUrl) return undefined;
  if (artUrl.startsWith("/api/v1/plex/photo?path=") || artUrl.startsWith("/api/")) {
    return artUrl;
  }
  if (artUrl.startsWith("/")) {
    return `/api/v1/plex/photo?path=${encodeURIComponent(artUrl)}`;
  }
  return artUrl;
}
