import type { Track } from "@dexaudio/shared-types";
import type { PlexConfig } from "./plex-client.js";
import { fetchSimilarTracks, proxyArtUrl } from "./plex-client.js";

export async function getSimilarTracks(
  config: PlexConfig,
  seedTrackId: string,
  limit: number,
): Promise<Track[]> {
  const tracks = await fetchSimilarTracks(config, seedTrackId, limit);
  return tracks.map((t) => ({ ...t, artUrl: proxyArtUrl(t.artUrl) }));
}
