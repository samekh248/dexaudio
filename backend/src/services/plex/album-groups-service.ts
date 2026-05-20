import type { AlbumGroupsResponse, ArtistSpotlight } from "@dexaudio/shared-types";
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
const GROUP_LIMIT = 5;

export function selectRecentlyPlayed(albums: AlbumWithStats[], now = Date.now()): AlbumWithStats[] {
  return [...albums]
    .filter((a) => (a.playCount30d ?? 0) > 0)
    .sort((a, b) => {
      const pc = (b.playCount30d ?? 0) - (a.playCount30d ?? 0);
      if (pc !== 0) return pc;
      const aT = a.lastPlayedAt?.getTime() ?? 0;
      const bT = b.lastPlayedAt?.getTime() ?? 0;
      return bT - aT;
    })
    .slice(0, GROUP_LIMIT);
}

export function selectRecentlyAdded(albums: AlbumWithStats[]): AlbumWithStats[] {
  return [...albums]
    .filter((a) => a.addedAt)
    .sort((a, b) => {
      const aT = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const bT = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      return bT - aT;
    })
    .slice(0, GROUP_LIMIT);
}

export function selectHiddenGems(albums: AlbumWithStats[], now = Date.now()): AlbumWithStats[] {
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
    .slice(0, GROUP_LIMIT);
}

export function selectRandomPicks(albums: AlbumWithStats[], limit = GROUP_LIMIT): AlbumWithStats[] {
  if (albums.length <= limit) return [...albums];
  const copy = [...albums];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, limit);
}

export function getEligibleArtistIds(albums: AlbumWithStats[]): Map<string, { name: string; albums: AlbumWithStats[] }> {
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

export async function getAlbumGroups(
  db: Db,
  config: PlexConfig,
  libraryId: string,
): Promise<AlbumGroupsResponse> {
  const albums = await libraryService.getAllAlbumsWithStats(config, libraryId);
  const playCounts30d = await libraryService.getAlbumPlayCounts30d(config, libraryId);
  for (const album of albums) {
    album.playCount30d = playCounts30d.get(album.id) ?? 0;
  }

  const recentlyPlayed = selectRecentlyPlayed(albums).map(plexClient.toPublicAlbum);
  const recentlyAdded = selectRecentlyAdded(albums).map(plexClient.toPublicAlbum);
  const hiddenGems = selectHiddenGems(albums).map(plexClient.toPublicAlbum);
  const randomPicks = selectRandomPicks(albums).map(plexClient.toPublicAlbum);

  const eligible = getEligibleArtistIds(albums);
  const eligibleIds = [...eligible.keys()];
  const selectedIds = await spotlightRepo.selectLeastRecentlyShown(db, eligibleIds, GROUP_LIMIT);
  const now = new Date();
  await spotlightRepo.markShown(db, selectedIds, now);
  const artistSpotlights = buildArtistSpotlightTiles(selectedIds, eligible);

  return {
    recentlyPlayed,
    recentlyAdded,
    hiddenGems,
    randomPicks,
    artistSpotlights,
  };
}
