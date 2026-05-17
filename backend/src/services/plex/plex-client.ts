import { ValidationError } from "../../lib/errors.js";
import type { Album, PlexLibrary, Track } from "@dexaudio/shared-types";

export interface PlexConfig {
  serverUrl: string;
  token: string;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export async function validateConnection(config: PlexConfig): Promise<boolean> {
  const base = normalizeUrl(config.serverUrl);
  const res = await fetch(`${base}/identity?X-Plex-Token=${encodeURIComponent(config.token)}`);
  return res.ok;
}

export async function fetchLibraries(config: PlexConfig): Promise<PlexLibrary[]> {
  const base = normalizeUrl(config.serverUrl);
  const res = await fetch(`${base}/library/sections?X-Plex-Token=${encodeURIComponent(config.token)}`);
  if (!res.ok) throw new ValidationError("Could not reach Plex server", "Check URL and token");
  const xml = await res.text();
  return parseLibrariesXml(xml);
}

export function parseLibrariesXml(xml: string): PlexLibrary[] {
  const libraries: PlexLibrary[] = [];
  const regex = /<Directory[^>]*key="(\d+)"[^>]*title="([^"]*)"[^>]*type="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const [, id, title, type] = match;
    if (type === "artist") {
      libraries.push({ id, title, type });
    }
  }
  return libraries;
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

export function parseAlbumFromMetadata(attrs: Record<string, string>): Album {
  return {
    id: attrs.ratingKey ?? attrs.key ?? "",
    title: attrs.title ?? "Unknown",
    artist: attrs.parentTitle ?? attrs.grandparentTitle ?? "Unknown Artist",
    year: attrs.year ? Number(attrs.year) : undefined,
    artUrl: attrs.thumb,
    playCount: attrs.viewCount ? Number(attrs.viewCount) : undefined,
  };
}

export async function fetchAlbums(
  config: PlexConfig,
  libraryId: string,
  page: number,
  pageSize: number,
): Promise<{ items: Album[]; total: number }> {
  const base = normalizeUrl(config.serverUrl);
  const start = (page - 1) * pageSize;
  const url = `${base}/library/sections/${libraryId}/all?X-Plex-Token=${encodeURIComponent(config.token)}&type=9&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${pageSize}`;
  const res = await fetch(url);
  if (!res.ok) return { items: [], total: 0 };
  const xml = await res.text();
  return parseAlbumPageXml(xml, page);
}

export function parseAlbumPageXml(xml: string, page: number): { items: Album[]; total: number } {
  const containerMatch = xml.match(/<MediaContainer[^>]*totalSize="(\d+)"/);
  const total = containerMatch ? Number(containerMatch[1]) : 0;
  const items: Album[] = [];
  const dirRegex = /<Directory([^>]*)\/>/g;
  let match: RegExpExecArray | null;
  while ((match = dirRegex.exec(xml)) !== null) {
    const attrs = parseAttrs(match[1]);
    items.push(parseAlbumFromMetadata(attrs));
  }
  return { items, total: total || items.length, page } as { items: Album[]; total: number };
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
  const trackRegex = /<Track([^>]*)\/>/g;
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
  const trackRegex = /<Track([^>]*)\/>/g;
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
