import type { Album, AlbumPage, SearchResults, Track } from "@dexaudio/shared-types";
import type { PlexConfig } from "./plex-client.js";
import * as plexClient from "./plex-client.js";
import { proxyArtUrl } from "./plex-client.js";
import type { AlbumWithStats } from "./plex-client.js";

const albumCache = new Map<string, { data: AlbumPage; expires: number }>();
const allAlbumsCache = new Map<string, { data: AlbumWithStats[]; expires: number }>();
const playCount30dCache = new Map<string, { data: Map<string, number>; expires: number }>();
const allAlbumsInFlight = new Map<string, Promise<AlbumWithStats[]>>();
const playCount30dInFlight = new Map<string, Promise<Map<string, number>>>();
const CACHE_TTL_MS = 60_000;

/** Coalesce concurrent loads for the same library (e.g. five parallel home-group requests). */
async function dedupeInFlight<T>(
  key: string,
  inFlight: Map<string, Promise<T>>,
  load: () => Promise<T>,
): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = load().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

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
  const publicItems = items.map((a) => ({ ...plexClient.toPublicAlbum(a) }));
  const result: AlbumPage = { items: publicItems, total, page };
  albumCache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL_MS });
  return result;
}

export async function getAllAlbumsWithStats(
  config: PlexConfig,
  libraryId: string,
): Promise<AlbumWithStats[]> {
  const cacheKey = libraryId;
  const cached = allAlbumsCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.data;

  return dedupeInFlight(cacheKey, allAlbumsInFlight, async () => {
    const again = allAlbumsCache.get(cacheKey);
    if (again && again.expires > Date.now()) return again.data;
    const data = await plexClient.fetchAllAlbums(config, libraryId);
    allAlbumsCache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
    return data;
  });
}

export async function getAlbumPlayCounts30d(
  config: PlexConfig,
  libraryId: string,
): Promise<Map<string, number>> {
  const cacheKey = libraryId;
  const cached = playCount30dCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.data;

  return dedupeInFlight(cacheKey, playCount30dInFlight, async () => {
    const again = playCount30dCache.get(cacheKey);
    if (again && again.expires > Date.now()) return again.data;
    const data = await plexClient.fetchAlbumPlayCounts30d(config, libraryId);
    playCount30dCache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
    return data;
  });
}

export async function getArtistAlbums(config: PlexConfig, artistId: string): Promise<Album[]> {
  const albums = await plexClient.fetchArtistAlbums(config, artistId);
  return albums.map(plexClient.toPublicAlbum);
}

export async function getAlbumTracks(config: PlexConfig, albumId: string): Promise<Track[]> {
  const tracks = await plexClient.fetchAlbumTracks(config, albumId);
  return tracks.map((t) => ({ ...t, artUrl: proxyArtUrl(t.artUrl) }));
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
  const dirRegex = /<Directory\b([^>]*?)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = dirRegex.exec(xml)) !== null) {
    const attrs = parseAttrs(m[1]);
    const album = plexClient.parseAlbumFromMetadata(attrs);
    albums.push({ ...album, artUrl: proxyArtUrl(album.artUrl) });
  }
  const trackRegex = /<Track\b([^>]*?)\/?>/g;
  while ((m = trackRegex.exec(xml)) !== null) {
    const track = plexClient.parseTrackFromMetadata(parseAttrs(m[1]));
    tracks.push({ ...track, artUrl: proxyArtUrl(track.artUrl) });
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
  allAlbumsCache.clear();
  playCount30dCache.clear();
  allAlbumsInFlight.clear();
  playCount30dInFlight.clear();
}
