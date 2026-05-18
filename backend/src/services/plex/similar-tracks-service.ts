import type { Track } from "@dexaudio/shared-types";
import type { PlexConfig } from "./plex-client.js";
import { fetchSimilarTracks } from "./plex-client.js";

export async function getSimilarTracks(
  config: PlexConfig,
  seedTrackId: string,
  limit: number,
): Promise<Track[]> {
  return fetchSimilarTracks(config, seedTrackId, limit);
}
