import type { Album, AlbumGroupsResponse, ArtistSpotlight } from "@dexaudio/shared-types";
import type { getDb } from "../../db/index.js";
import type { PlexConfig } from "./plex-client.js";
import * as plexClient from "./plex-client.js";
import type { AlbumWithStats } from "./plex-client.js";
import { proxyArtUrl } from "./plex-client.js";
import * as spotlightRepo from "./artist-spotlight-repo.js";
import * as libraryService from "./library-service.js";

type Db = ReturnType<typeof getDb>;

export const HIDDEN_GEMS_RATING_MIN = 6;
export const NEGLECT_MS = 90 * 24 * 60 * 60 * 1000;
export const HOME_PREVIEW_LIMIT = 10;
export const VIEW_ALL_LIMIT = 20;

export function clampGroupLimit(limit: number): number {
  return Math.min(Math.max(1, Math.floor(limit)), VIEW_ALL_LIMIT);
}

export function selectRecentlyPlayed(
  albums: AlbumWithStats[],
  limit = HOME_PREVIEW_LIMIT,
  now = Date.now(),
): AlbumWithStats[] {
  return [...albums]
    .filter((a) => (a.playCount30d ?? 0) > 0)
    .sort((a, b) => {
      const pc = (b.playCount30d ?? 0) - (a.playCount30d ?? 0);
      if (pc !== 0) return pc;
      const aT = a.lastPlayedAt?.getTime() ?? 0;
      const bT = b.lastPlayedAt?.getTime() ?? 0;
      return bT - aT;
    })
    .slice(0, clampGroupLimit(limit));
}

export function selectRecentlyAdded(
  albums: AlbumWithStats[],
  limit = HOME_PREVIEW_LIMIT,
): AlbumWithStats[] {
  return [...albums]
    .filter((a) => a.addedAt)
    .sort((a, b) => {
      const aT = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const bT = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      return bT - aT;
    })
    .slice(0, clampGroupLimit(limit));
}

export function selectHiddenGems(
  albums: AlbumWithStats[],
  limit = HOME_PREVIEW_LIMIT,
  now = Date.now(),
): AlbumWithStats[] {
  const neglectBefore = now - NEGLECT_MS;
  return [...albums]
    .filter((a) => {
      if ((a.userRating ?? 0) < HIDDEN_GEMS_RATING_MIN) return false;
      if (!a.lastPlayedAt) return true;
      return a.lastPlayedAt.getTime() < neglectBefore;
    })
    .sort((a, b) => {
      const ratingDiff = (b.userRating ?? 0) - (a.userRating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      const aT = a.lastPlayedAt?.getTime() ?? -Infinity;
      const bT = b.lastPlayedAt?.getTime() ?? -Infinity;
      if (aT !== bT) return aT - bT;
      return a.id.localeCompare(b.id);
    })
    .slice(0, clampGroupLimit(limit));
}

export function selectRandomPicks(
  albums: AlbumWithStats[],
  limit = HOME_PREVIEW_LIMIT,
): AlbumWithStats[] {
  const cap = clampGroupLimit(limit);
  if (albums.length <= cap) return [...albums];
  const copy = [...albums];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, cap);
}

export function getEligibleArtistIds(
  albums: AlbumWithStats[],
): Map<string, { name: string; albums: AlbumWithStats[] }> {
  const byArtist = new Map<string, { name: string; albums: AlbumWithStats[] }>();
  for (const album of albums) {
    const artistId = album.artistId;
    if (!artistId) continue;
    const entry = byArtist.get(artistId) ?? { name: album.artist, albums: [] };
    entry.albums.push(album);
    byArtist.set(artistId, entry);
  }
  for (const [id, entry] of [...byArtist.entries()]) {
    if (entry.albums.length <= 2) byArtist.delete(id);
  }
  return byArtist;
}

function albumReleaseSortKey(album: AlbumWithStats): number {
  return album.year ?? Number.MAX_SAFE_INTEGER;
}

function buildArtistSpotlightTiles(
  selectedIds: string[],
  eligible: Map<string, { name: string; albums: AlbumWithStats[] }>,
): ArtistSpotlight[] {
  return selectedIds.map((artistId) => {
    const entry = eligible.get(artistId)!;
    const sorted = [...entry.albums].sort((a, b) => {
      const y = albumReleaseSortKey(a) - albumReleaseSortKey(b);
      if (y !== 0) return y;
      return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    });
    const albumArtUrls = sorted
      .map((a) => proxyArtUrl(a.artUrl))
      .filter((u): u is string => Boolean(u))
      .slice(0, 3);
    return {
      artistId,
      artistName: entry.name,
      albumCount: entry.albums.length,
      albumArtUrls,
    };
  });
}

async function loadAlbumsWithPlayCounts(
  config: PlexConfig,
  libraryId: string,
): Promise<AlbumWithStats[]> {
  const [albums, playCounts30d] = await Promise.all([
    libraryService.getAllAlbumsWithStats(config, libraryId),
    libraryService.getAlbumPlayCounts30d(config, libraryId),
  ]);
  for (const album of albums) {
    album.playCount30d = playCounts30d.get(album.id) ?? 0;
  }
  return albums;
}

async function buildArtistSpotlights(
  db: Db,
  albums: AlbumWithStats[],
  limit = HOME_PREVIEW_LIMIT,
): Promise<ArtistSpotlight[]> {
  const cap = clampGroupLimit(limit);
  const eligible = getEligibleArtistIds(albums);
  const eligibleIds = [...eligible.keys()];
  const selectedIds = await spotlightRepo.selectLeastRecentlyShown(db, eligibleIds, cap);
  if (cap <= HOME_PREVIEW_LIMIT) {
    await spotlightRepo.markShown(db, selectedIds, new Date());
  }
  return buildArtistSpotlightTiles(selectedIds, eligible);
}

export async function getRecentlyPlayed(
  config: PlexConfig,
  libraryId: string,
  limit = HOME_PREVIEW_LIMIT,
): Promise<{ items: Album[] }> {
  const albums = await loadAlbumsWithPlayCounts(config, libraryId);
  return { items: selectRecentlyPlayed(albums, limit).map(plexClient.toPublicAlbum) };
}

export async function getRecentlyAdded(
  config: PlexConfig,
  libraryId: string,
  limit = HOME_PREVIEW_LIMIT,
): Promise<{ items: Album[] }> {
  const albums = await loadAlbumsWithPlayCounts(config, libraryId);
  return { items: selectRecentlyAdded(albums, limit).map(plexClient.toPublicAlbum) };
}

export async function getHiddenGems(
  config: PlexConfig,
  libraryId: string,
  limit = HOME_PREVIEW_LIMIT,
): Promise<{ items: Album[] }> {
  const albums = await loadAlbumsWithPlayCounts(config, libraryId);
  return { items: selectHiddenGems(albums, limit).map(plexClient.toPublicAlbum) };
}

export async function getRandomPicks(
  config: PlexConfig,
  libraryId: string,
  limit = HOME_PREVIEW_LIMIT,
): Promise<{ items: Album[] }> {
  const albums = await loadAlbumsWithPlayCounts(config, libraryId);
  return { items: selectRandomPicks(albums, limit).map(plexClient.toPublicAlbum) };
}

export async function getArtistSpotlights(
  db: Db,
  config: PlexConfig,
  libraryId: string,
  limit = HOME_PREVIEW_LIMIT,
): Promise<{ items: ArtistSpotlight[] }> {
  const albums = await loadAlbumsWithPlayCounts(config, libraryId);
  return { items: await buildArtistSpotlights(db, albums, limit) };
}

/** @deprecated Prefer per-group endpoints; kept for backward compatibility. */
export async function getAlbumGroups(
  db: Db,
  config: PlexConfig,
  libraryId: string,
): Promise<AlbumGroupsResponse> {
  const limit = HOME_PREVIEW_LIMIT;
  const albums = await loadAlbumsWithPlayCounts(config, libraryId);
  const [recentlyPlayed, recentlyAdded, hiddenGems, randomPicks, artistSpotlights] =
    await Promise.all([
      Promise.resolve(selectRecentlyPlayed(albums, limit).map(plexClient.toPublicAlbum)),
      Promise.resolve(selectRecentlyAdded(albums, limit).map(plexClient.toPublicAlbum)),
      Promise.resolve(selectHiddenGems(albums, limit).map(plexClient.toPublicAlbum)),
      Promise.resolve(selectRandomPicks(albums, limit).map(plexClient.toPublicAlbum)),
      buildArtistSpotlights(db, albums, limit),
    ]);
  return {
    recentlyPlayed,
    recentlyAdded,
    hiddenGems,
    randomPicks,
    artistSpotlights,
  };
}
