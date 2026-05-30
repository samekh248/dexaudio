import { ValidationError } from "../../lib/errors.js";
import { decodeXmlEntities } from "../../lib/xml-entities.js";
import { PLEX_CLIENT_ID, PLEX_PRODUCT_NAME } from "../../lib/config.js";
import type { Album, PlexLibrary, Track, TrackFormat } from "@dexaudio/shared-types";

export interface AlbumWithStats extends Album {
  artistId?: string;
  lastPlayedAt?: Date;
  playCount30d?: number;
}

export interface PlexConfig {
  serverUrl: string;
  token: string;
  machineIdentifier?: string;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function plexMediaHeaders(token: string): Record<string, string> {
  return {
    Accept: "*/*",
    "X-Plex-Token": token,
    "X-Plex-Client-Identifier": PLEX_CLIENT_ID,
    "X-Plex-Product": PLEX_PRODUCT_NAME,
    "X-Plex-Version": "1.0.0",
    "X-Plex-Device": "Web",
    "X-Plex-Platform": "Web",
  };
}

export async function validateConnection(config: PlexConfig, timeoutMs = 4000): Promise<boolean> {
  const base = normalizeUrl(config.serverUrl);
  try {
    const res = await fetchWithTimeout(
      `${base}/identity?X-Plex-Token=${encodeURIComponent(config.token)}`,
      timeoutMs,
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLibraries(config: PlexConfig): Promise<PlexLibrary[]> {
  const base = normalizeUrl(config.serverUrl);
  const res = await fetchWithTimeout(
    `${base}/library/sections?X-Plex-Token=${encodeURIComponent(config.token)}`,
    10000,
  );
  if (!res.ok) throw new ValidationError("Could not reach Plex server", "Check URL and token");
  const xml = await res.text();
  return parseLibrariesXml(xml);
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function parseLibrariesXml(xml: string): PlexLibrary[] {
  const libraries: PlexLibrary[] = [];
  const dirRegex = /<Directory\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = dirRegex.exec(xml)) !== null) {
    const attrs = parseDirAttrs(match[1]);
    if (attrs.type !== "artist") continue;
    const id = attrs.key;
    const title = attrs.title;
    if (!id || !title) continue;
    libraries.push({ id, title, type: attrs.type });
  }
  return libraries;
}

function parseDirAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1]] = decodeXmlEntities(m[2]);
  }
  return attrs;
}

/** Plex album cover path for a track (parent album metadata, not the track key). */
export function resolveTrackArtPath(attrs: Record<string, string>): string | undefined {
  const thumb = attrs.thumb;
  if (thumb?.startsWith("/")) return thumb;
  if (attrs.parentThumb?.startsWith("/")) return attrs.parentThumb;
  if (attrs.grandparentThumb?.startsWith("/")) return attrs.grandparentThumb;
  const albumKey = attrs.parentRatingKey;
  if (!albumKey) return undefined;
  if (thumb) return `/library/metadata/${albumKey}/thumb/${thumb}`;
  return `/library/metadata/${albumKey}/thumb`;
}

function codecToFormat(codec: string): TrackFormat {
  const c = codec.toLowerCase();
  if (c.includes("flac")) return "flac";
  if (c.includes("mp3") || c === "mp3") return "mp3";
  if (c.includes("aac") || c.includes("m4a")) return "aac";
  if (c.includes("ogg") || c.includes("opus") || c.includes("vorbis")) return "ogg";
  if (c.includes("wav") || c.includes("wave")) return "wav";
  if (c.includes("alac")) return "alac";
  if (c.includes("wma") || c.includes("wmav2")) return "wma";
  return "unsupported";
}

function plexText(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return decodeXmlEntities(value);
}

export function parseTrackFromMetadata(attrs: Record<string, string>): Track {
  const format = codecToFormat(attrs.codec ?? "");

  return {
    id: attrs.ratingKey ?? attrs.key ?? "",
    title: plexText(attrs.title, "Unknown"),
    artist: plexText(attrs.grandparentTitle ?? attrs.originalTitle, "Unknown Artist"),
    album: plexText(attrs.parentTitle, "Unknown Album"),
    albumId: attrs.parentRatingKey,
    durationMs: Number(attrs.duration ?? 0),
    format,
    artUrl: resolveTrackArtPath(attrs),
    playCount: attrs.viewCount ? Number(attrs.viewCount) : undefined,
  };
}

function unixSecondsToDate(seconds: string | undefined): Date | undefined {
  if (!seconds) return undefined;
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(n * 1000);
}

export function parseAlbumFromMetadata(attrs: Record<string, string>): AlbumWithStats {
  const addedAt = unixSecondsToDate(attrs.addedAt);
  const lastPlayedAt = unixSecondsToDate(attrs.lastViewedAt);
  const userRatingRaw = attrs.userRating;
  const userRating =
    userRatingRaw !== undefined && userRatingRaw !== ""
      ? Number(userRatingRaw)
      : undefined;

  return {
    id: attrs.ratingKey ?? attrs.key ?? "",
    title: plexText(attrs.title, "Unknown"),
    artist: plexText(attrs.parentTitle ?? attrs.grandparentTitle, "Unknown Artist"),
    artistId: attrs.parentRatingKey ?? attrs.grandparentRatingKey,
    year: attrs.year ? Number(attrs.year) : undefined,
    artUrl: attrs.thumb,
    playCount: attrs.viewCount ? Number(attrs.viewCount) : undefined,
    userRating: userRating !== undefined && !Number.isNaN(userRating) ? userRating : undefined,
    addedAt: addedAt?.toISOString(),
    lastPlayedAt,
  };
}

export function proxyArtUrl(plexPath: string | undefined): string | undefined {
  if (!plexPath) return undefined;
  return `/api/v1/plex/photo?path=${encodeURIComponent(plexPath)}`;
}

export function toPublicAlbum(album: AlbumWithStats): Album {
  const { lastPlayedAt: _last, artistId: _aid, playCount30d: _p30, ...rest } = album;
  return { ...rest, artUrl: proxyArtUrl(rest.artUrl) };
}

export async function fetchAllAlbums(
  config: PlexConfig,
  libraryId: string,
  pageSize = 500,
): Promise<AlbumWithStats[]> {
  const all: AlbumWithStats[] = [];
  let page = 1;
  let total = Infinity;
  while ((page - 1) * pageSize < total) {
    const { items, total: t } = await fetchAlbums(config, libraryId, page, pageSize);
    total = t;
    if (!items.length) break;
    all.push(...items);
    page += 1;
  }
  return all;
}

function aggregateTrackPlayCountsFromXml(xml: string, counts: Map<string, number>): void {
  const trackRegex = /<Track\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = trackRegex.exec(xml)) !== null) {
    const attrs = parseAttrs(match[1]);
    const albumKey = attrs.parentRatingKey;
    if (!albumKey) continue;
    const views = Number(attrs.viewCount ?? 1);
    counts.set(albumKey, (counts.get(albumKey) ?? 0) + (views > 0 ? views : 1));
  }
}

/** Aggregate track views in the trailing 30 days by parent album rating key. */
export async function fetchAlbumPlayCounts30d(
  config: PlexConfig,
  libraryId: string,
): Promise<Map<string, number>> {
  return fetchAlbumPlayCounts30dBounded(config, libraryId, {
    maxPages: Number.POSITIVE_INFINITY,
    stopWhenAlbums: Number.POSITIVE_INFINITY,
  });
}

/** Bounded 30-day play aggregation for recently-played (avoids scanning entire play history). */
export async function fetchAlbumPlayCounts30dBounded(
  config: PlexConfig,
  libraryId: string,
  options: { maxPages?: number; pageSize?: number; stopWhenAlbums?: number } = {},
): Promise<Map<string, number>> {
  const base = normalizeUrl(config.serverUrl);
  const thirtyDaysAgoSec = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const counts = new Map<string, number>();
  const pageSize = options.pageSize ?? 500;
  const maxPages = options.maxPages ?? 2;
  const stopWhenAlbums = options.stopWhenAlbums ?? 60;
  let start = 0;
  let total = Infinity;
  let pages = 0;

  while (start < total && pages < maxPages) {
    const url = `${base}/library/sections/${libraryId}/all?type=10&viewedAt>=${thirtyDaysAgoSec}&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${pageSize}&X-Plex-Token=${encodeURIComponent(config.token)}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      break;
    }
    if (!res.ok) break;
    const xml = await res.text();
    const containerMatch = xml.match(/<MediaContainer[^>]*totalSize="(\d+)"/);
    total = containerMatch ? Number(containerMatch[1]) : 0;
    aggregateTrackPlayCountsFromXml(xml, counts);
    start += pageSize;
    pages += 1;
    if (total === 0) break;
    if (counts.size >= stopWhenAlbums) break;
  }

  return counts;
}

export async function fetchArtistAlbums(
  config: PlexConfig,
  artistId: string,
): Promise<AlbumWithStats[]> {
  const base = normalizeUrl(config.serverUrl);
  const url = `${base}/library/metadata/${artistId}/children?X-Plex-Token=${encodeURIComponent(config.token)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const xml = await res.text();
  const items: AlbumWithStats[] = [];
  const dirRegex = /<Directory\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = dirRegex.exec(xml)) !== null) {
    items.push(parseAlbumFromMetadata(parseAttrs(match[1])));
  }
  return items;
}

export async function fetchAlbums(
  config: PlexConfig,
  libraryId: string,
  page: number,
  pageSize: number,
): Promise<{ items: AlbumWithStats[]; total: number }> {
  const base = normalizeUrl(config.serverUrl);
  const start = (page - 1) * pageSize;
  const url = `${base}/library/sections/${libraryId}/all?X-Plex-Token=${encodeURIComponent(config.token)}&type=9&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${pageSize}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return { items: [], total: 0 };
  }
  if (!res.ok) return { items: [], total: 0 };
  const xml = await res.text();
  return parseAlbumPageXml(xml, page);
}

export async function fetchAlbumsSorted(
  config: PlexConfig,
  libraryId: string,
  options: { sort: string; start: number; size: number },
): Promise<{ items: AlbumWithStats[]; total: number }> {
  const base = normalizeUrl(config.serverUrl);
  const { sort, start, size } = options;
  const url = `${base}/library/sections/${libraryId}/all?X-Plex-Token=${encodeURIComponent(config.token)}&type=9&sort=${encodeURIComponent(sort)}&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${size}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return { items: [], total: 0 };
  }
  if (!res.ok) return { items: [], total: 0 };
  const xml = await res.text();
  return parseAlbumPageXml(xml, 1);
}

export interface PlexArtistEntry {
  id: string;
  title: string;
  childCount?: number;
}

export async function fetchArtistsPage(
  config: PlexConfig,
  libraryId: string,
  options: { start: number; size: number },
): Promise<{ items: PlexArtistEntry[]; total: number }> {
  const base = normalizeUrl(config.serverUrl);
  const { start, size } = options;
  const url = `${base}/library/sections/${libraryId}/all?X-Plex-Token=${encodeURIComponent(config.token)}&type=8&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${size}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return { items: [], total: 0 };
  }
  if (!res.ok) return { items: [], total: 0 };
  const xml = await res.text();
  const containerMatch = xml.match(/<MediaContainer[^>]*totalSize="(\d+)"/);
  const total = containerMatch ? Number(containerMatch[1]) : 0;
  const items: PlexArtistEntry[] = [];
  const dirRegex = /<Directory\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = dirRegex.exec(xml)) !== null) {
    const attrs = parseAttrs(match[1]);
    const id = attrs.ratingKey ?? attrs.key;
    const title = attrs.title;
    if (!id || !title) continue;
    const childCountRaw = attrs.childCount;
    const childCount =
      childCountRaw !== undefined && childCountRaw !== ""
        ? Number(childCountRaw)
        : undefined;
    items.push({
      id,
      title,
      childCount: childCount !== undefined && !Number.isNaN(childCount) ? childCount : undefined,
    });
  }
  return { items, total: total || items.length };
}

const METADATA_BATCH_CAP = 50;

export async function fetchAlbumMetadataBatch(
  config: PlexConfig,
  ratingKeys: string[],
): Promise<AlbumWithStats[]> {
  const keys = ratingKeys.slice(0, METADATA_BATCH_CAP);
  const base = normalizeUrl(config.serverUrl);
  const results = await Promise.all(
    keys.map(async (id) => {
      const url = `${base}/library/metadata/${id}?X-Plex-Token=${encodeURIComponent(config.token)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const xml = await res.text();
      const dirMatch = xml.match(/<Directory\b([^>]*?)\/?>/i);
      if (!dirMatch) return null;
      return parseAlbumFromMetadata(parseAttrs(dirMatch[1]));
    }),
  );
  return results.filter((a): a is AlbumWithStats => a !== null);
}

export function parseAlbumPageXml(xml: string, page: number): { items: AlbumWithStats[]; total: number } {
  const containerMatch = xml.match(/<MediaContainer[^>]*totalSize="(\d+)"/);
  const total = containerMatch ? Number(containerMatch[1]) : 0;
  const items: AlbumWithStats[] = [];
  const dirRegex = /<Directory\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = dirRegex.exec(xml)) !== null) {
    const attrs = parseAttrs(match[1]);
    items.push(parseAlbumFromMetadata(attrs));
  }
  return { items, total: total || items.length };
}

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1]] = decodeXmlEntities(m[2]);
  }
  return attrs;
}

export async function fetchAlbumTracks(config: PlexConfig, albumId: string): Promise<Track[]> {
  const base = normalizeUrl(config.serverUrl);
  const url = `${base}/library/metadata/${albumId}/children?X-Plex-Token=${encodeURIComponent(config.token)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const xml = await res.text();
  const tracks: Track[] = [];
  const trackRegex = /<Track\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = trackRegex.exec(xml)) !== null) {
    tracks.push(parseTrackFromMetadata(parseAttrs(match[1])));
  }
  return tracks;
}

export async function fetchSimilarTracks(
  config: PlexConfig,
  seedTrackId: string,
  limit: number,
): Promise<Track[]> {
  const base = normalizeUrl(config.serverUrl);
  const url = `${base}/library/metadata/${seedTrackId}/radio?X-Plex-Token=${encodeURIComponent(config.token)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const xml = await res.text();
  const tracks: Track[] = [];
  const trackRegex = /<Track\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = trackRegex.exec(xml)) !== null) {
    tracks.push(parseTrackFromMetadata(parseAttrs(match[1])));
  }
  return tracks;
}

export function getStreamUrl(config: PlexConfig, trackId: string): string {
  const base = normalizeUrl(config.serverUrl);
  return `${base}/library/metadata/${trackId}/file?X-Plex-Token=${encodeURIComponent(config.token)}`;
}

export function getTranscodeUrl(config: PlexConfig, trackId: string, bitrate = 320): string {
  const base = normalizeUrl(config.serverUrl);
  const path = `/library/metadata/${trackId}`;
  const params = new URLSearchParams({
    path,
    protocol: "http",
    musicBitrate: String(bitrate),
    maxAudioBitrate: String(bitrate),
    // Plex treats matching session ids as the same transcode job. The player may
    // preload the next track while the current one is still streaming, so scope
    // the transcode session to the track to avoid terminating the active stream.
    session: `${PLEX_CLIENT_ID}-${trackId}`,
  });
  return `${base}/music/:/transcode/universal/start.mp3?${params.toString()}&X-Plex-Token=${encodeURIComponent(config.token)}&X-Plex-Client-Identifier=${encodeURIComponent(PLEX_CLIENT_ID)}`;
}

/** Formats decodable by Howler html5 mode (HTML5 Audio element). FLAC is excluded — use Plex transcode. */
export function isBrowserNativeFormat(format: TrackFormat): boolean {
  return format === "mp3" || format === "aac" || format === "ogg";
}

export function parseTrackMetadataXml(xml: string): Track | null {
  const trackMatch = xml.match(/<Track\b([^>]*?)\/?>/i);
  if (!trackMatch) return null;
  const attrs = parseAttrs(trackMatch[1]);
  const mediaMatch = xml.match(/<Media\b([^>]*?)\/?>/i);
  if (mediaMatch && !attrs.codec) {
    const mediaAttrs = parseAttrs(mediaMatch[1]);
    if (mediaAttrs.codec) attrs.codec = mediaAttrs.codec;
  }
  return parseTrackFromMetadata(attrs);
}

export async function fetchTrackMetadata(config: PlexConfig, trackId: string): Promise<Track | null> {
  const base = normalizeUrl(config.serverUrl);
  const url = `${base}/library/metadata/${trackId}`;
  const res = await fetch(url, { headers: plexMediaHeaders(config.token) });
  if (res.status === 401) return null;
  if (res.status === 404) return null;
  if (!res.ok) throw new ValidationError("Could not reach Plex server", "Check URL and token");
  return parseTrackMetadataXml(await res.text());
}
