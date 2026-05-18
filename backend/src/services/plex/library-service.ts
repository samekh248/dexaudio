import type { Album, AlbumPage, SearchResults, Track } from "@dexaudio/shared-types";
import type { PlexConfig } from "./plex-client.js";
import * as plexClient from "./plex-client.js";

const albumCache = new Map<string, { data: AlbumPage; expires: number }>();
const CACHE_TTL_MS = 60_000;

export async function getAlbums(
  config: PlexConfig,
  libraryId: string,
  page: number,
  pageSize: number,
): Promise<AlbumPage> {
  const cacheKey = `${libraryId}:${page}:${pageSize}`;
  const cached = albumCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.data;

  const { items, total } = await plexClient.fetchAlbums(config, libraryId, page, pageSize);
  const result: AlbumPage = { items, total, page };
  albumCache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL_MS });
  return result;
}

export async function getArtistAlbums(_config: PlexConfig, artistId: string): Promise<Album[]> {
  // Plex artist children are albums
  return [];
}

export async function getAlbumTracks(config: PlexConfig, albumId: string): Promise<Track[]> {
  return plexClient.fetchAlbumTracks(config, albumId);
}

export async function searchLibrary(
  config: PlexConfig,
  query: string,
): Promise<SearchResults> {
  const base = config.serverUrl.replace(/\/$/, "");
  const url = `${base}/search?query=${encodeURIComponent(query)}&X-Plex-Token=${encodeURIComponent(config.token)}&type=9,10`;
  const res = await fetch(url);
  if (!res.ok) return { albums: [], tracks: [] };
  const xml = await res.text();
  const albums: Album[] = [];
  const tracks: Track[] = [];
  const dirRegex = /<Directory([^>]*)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = dirRegex.exec(xml)) !== null) {
    const attrs = parseAttrs(m[1]);
    albums.push(plexClient.parseAlbumFromMetadata(attrs));
  }
  const trackRegex = /<Track([^>]*)\/>/g;
  while ((m = trackRegex.exec(xml)) !== null) {
    tracks.push(plexClient.parseTrackFromMetadata(parseAttrs(m[1])));
  }
  return { albums, tracks };
}

function parseAttrs(s: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

export function clearAlbumCache() {
  albumCache.clear();
}
