import { ValidationError } from "../../lib/errors.js";
import type { Album, PlexLibrary, Track } from "@dexaudio/shared-types";

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
    attrs[m[1]] = m[2];
  }
  return attrs;
}

export function parseTrackFromMetadata(attrs: Record<string, string>): Track {
  const codec = (attrs.codec ?? "").toLowerCase();
  let format: Track["format"] = "unsupported";
  if (codec.includes("flac")) format = "flac";
  else if (codec.includes("mp3") || codec === "mp3") format = "mp3";

  return {
    id: attrs.ratingKey ?? attrs.key ?? "",
    title: attrs.title ?? "Unknown",
    artist: attrs.grandparentTitle ?? attrs.originalTitle ?? "Unknown Artist",
    album: attrs.parentTitle ?? "Unknown Album",
    albumId: attrs.parentRatingKey,
    durationMs: Number(attrs.duration ?? 0),
    format,
    artUrl: attrs.thumb ? `/library/metadata/${attrs.ratingKey}/thumb` : undefined,
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
    title: attrs.title ?? "Unknown",
    artist: attrs.parentTitle ?? attrs.grandparentTitle ?? "Unknown Artist",
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

/** Aggregate track views in the trailing 30 days by parent album rating key. */
export async function fetchAlbumPlayCounts30d(
  config: PlexConfig,
  libraryId: string,
): Promise<Map<string, number>> {
  const base = normalizeUrl(config.serverUrl);
  const thirtyDaysAgoSec = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const counts = new Map<string, number>();
  const pageSize = 500;
  let start = 0;
  let total = Infinity;

  while (start < total) {
    const url = `${base}/library/sections/${libraryId}/all?type=10&viewedAt>=${thirtyDaysAgoSec}&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${pageSize}&X-Plex-Token=${encodeURIComponent(config.token)}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const xml = await res.text();
    const containerMatch = xml.match(/<MediaContainer[^>]*totalSize="(\d+)"/);
    total = containerMatch ? Number(containerMatch[1]) : 0;
    const trackRegex = /<Track\b([^>]*?)\/?>/g;
    let match: RegExpExecArray | null;
    while ((match = trackRegex.exec(xml)) !== null) {
      const attrs = parseAttrs(match[1]);
      const albumKey = attrs.parentRatingKey;
      if (!albumKey) continue;
      const views = Number(attrs.viewCount ?? 1);
      counts.set(albumKey, (counts.get(albumKey) ?? 0) + (views > 0 ? views : 1));
    }
    start += pageSize;
    if (total === 0) break;
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
  const res = await fetch(url);
  if (!res.ok) return { items: [], total: 0 };
  const xml = await res.text();
  return parseAlbumPageXml(xml, page);
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
    attrs[m[1]] = m[2];
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
