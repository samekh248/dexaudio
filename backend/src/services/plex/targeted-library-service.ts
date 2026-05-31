import type { ArtistSpotlight } from "@dexaudio/shared-types";
import type { getDb } from "../../db/index.js";
import {
  HOME_PREVIEW_LIMIT,
  buildArtistSpotlightTiles,
  clampGroupLimit,
  getEligibleArtistIds,
  selectHiddenGems,
  selectRandomPicks,
  selectRecentlyAdded,
  selectRecentlyPlayed,
} from "./album-groups-service.js";
import type { PlexConfig } from "./plex-client.js";
import * as plexClient from "./plex-client.js";
import type { AlbumWithStats } from "./plex-client.js";
import * as spotlightRepo from "./artist-spotlight-repo.js";

type Db = ReturnType<typeof getDb>;

export const GROUP_FETCH_SIZE = 20;
export const FALLBACK_SCAN_CAP = 500;
export const RANDOM_POOL_RECENT = 300;
export const RANDOM_POOL_ALPHA = 300;
export const CACHE_TTL_MS = 60_000;

export type LibraryQueryProfile =
  | "recently-added"
  | "recently-played"
  | "hidden-gems"
  | "random-picks";

const profileCache = new Map<string, { items: AlbumWithStats[]; expires: number }>();
const spotlightCache = new Map<string, { items: ArtistSpotlight[]; expires: number }>();
const profileInFlight = new Map<string, Promise<AlbumWithStats[]>>();
const spotlightInFlight = new Map<string, Promise<ArtistSpotlight[]>>();

export function profileCacheKey(libraryId: string, profile: string): string {
  return `${libraryId}:profile:${profile}`;
}

export function sliceItems<T>(items: T[], limit: number): T[] {
  return items.slice(0, clampGroupLimit(limit));
}

export function clearProfileCache(): void {
  profileCache.clear();
  spotlightCache.clear();
  profileInFlight.clear();
  spotlightInFlight.clear();
}

export function invalidateRecentlyPlayedProfileCache(): void {
  for (const key of [...profileCache.keys()]) {
    if (key.endsWith(":profile:recently-played")) profileCache.delete(key);
  }
  for (const key of [...profileInFlight.keys()]) {
    if (key.endsWith(":profile:recently-played")) profileInFlight.delete(key);
  }
}

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

export async function scanAlbumsBounded(
  config: PlexConfig,
  libraryId: string,
  maxN: number,
): Promise<AlbumWithStats[]> {
  const all: AlbumWithStats[] = [];
  const pageSize = 100;
  let page = 1;
  let total = Infinity;
  while (all.length < maxN && (page - 1) * pageSize < total) {
    const { items, total: t } = await plexClient.fetchAlbums(config, libraryId, page, pageSize);
    total = t;
    if (!items.length) break;
    for (const item of items) {
      all.push(item);
      if (all.length >= maxN) break;
    }
    page += 1;
  }
  return all.slice(0, maxN);
}

async function tryFetchAlbumsSorted(
  config: PlexConfig,
  libraryId: string,
  sort: string,
  size: number,
): Promise<AlbumWithStats[] | null> {
  const { items } = await plexClient.fetchAlbumsSorted(config, libraryId, {
    sort,
    start: 0,
    size,
  });
  if (!items.length) return null;
  return items;
}

async function loadCachedProfile(
  profile: LibraryQueryProfile,
  config: PlexConfig,
  libraryId: string,
  loadTwenty: () => Promise<AlbumWithStats[]>,
): Promise<AlbumWithStats[]> {
  const key = profileCacheKey(libraryId, profile);
  const cached = profileCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.items;

  return dedupeInFlight(key, profileInFlight, async () => {
    const again = profileCache.get(key);
    if (again && again.expires > Date.now()) return again.items;
    const items = await loadTwenty();
    profileCache.set(key, { items, expires: Date.now() + CACHE_TTL_MS });
    return items;
  });
}

export async function loadRecentlyAddedProfile(
  config: PlexConfig,
  libraryId: string,
): Promise<AlbumWithStats[]> {
  return loadCachedProfile("recently-added", config, libraryId, async () => {
    const remote = await tryFetchAlbumsSorted(config, libraryId, "addedAt:desc", GROUP_FETCH_SIZE);
    if (remote) return selectRecentlyAdded(remote, GROUP_FETCH_SIZE);
    const scanned = await scanAlbumsBounded(config, libraryId, FALLBACK_SCAN_CAP);
    return selectRecentlyAdded(scanned, GROUP_FETCH_SIZE);
  });
}

export async function loadRecentlyPlayedProfile(
  config: PlexConfig,
  libraryId: string,
): Promise<AlbumWithStats[]> {
  return loadCachedProfile("recently-played", config, libraryId, async () => {
    const remote = await tryFetchAlbumsSorted(
      config,
      libraryId,
      "lastViewedAt:desc",
      GROUP_FETCH_SIZE,
    );
    if (remote) return selectRecentlyPlayed(remote, GROUP_FETCH_SIZE);
    const scanned = await scanAlbumsBounded(config, libraryId, FALLBACK_SCAN_CAP);
    return selectRecentlyPlayed(scanned, GROUP_FETCH_SIZE);
  });
}

export async function loadHiddenGemsProfile(
  config: PlexConfig,
  libraryId: string,
): Promise<AlbumWithStats[]> {
  return loadCachedProfile("hidden-gems", config, libraryId, async () => {
    const remote = await tryFetchAlbumsSorted(
      config,
      libraryId,
      "userRating:desc",
      FALLBACK_SCAN_CAP,
    );
    const candidates = remote ?? (await scanAlbumsBounded(config, libraryId, FALLBACK_SCAN_CAP));
    return selectHiddenGems(candidates, GROUP_FETCH_SIZE);
  });
}

function dedupeAlbumsById(albums: AlbumWithStats[]): AlbumWithStats[] {
  const seen = new Set<string>();
  const out: AlbumWithStats[] = [];
  for (const album of albums) {
    if (seen.has(album.id)) continue;
    seen.add(album.id);
    out.push(album);
  }
  return out;
}

export async function loadRandomPicksProfile(
  config: PlexConfig,
  libraryId: string,
): Promise<AlbumWithStats[]> {
  return loadCachedProfile("random-picks", config, libraryId, async () => {
    const recent =
      (await tryFetchAlbumsSorted(config, libraryId, "addedAt:desc", RANDOM_POOL_RECENT)) ?? [];
    const pageSize = 100;
    const alphaStarts = [0, 100, 200].filter((start) => start < RANDOM_POOL_ALPHA);
    const alphaPages = (
      await Promise.all(
        alphaStarts.map((start) =>
          plexClient.fetchAlbumsSorted(config, libraryId, {
            sort: "titleSort:asc",
            start,
            size: pageSize,
          }),
        ),
      )
    ).flatMap((page) => page.items);

    let pool = dedupeAlbumsById([...recent, ...alphaPages]);
    if (!pool.length) {
      pool = await scanAlbumsBounded(config, libraryId, FALLBACK_SCAN_CAP);
    }
    return selectRandomPicks(pool, GROUP_FETCH_SIZE);
  });
}

export async function loadArtistSpotlightsProfile(
  db: Db,
  config: PlexConfig,
  libraryId: string,
  limit: number,
): Promise<ArtistSpotlight[]> {
  const cap = clampGroupLimit(limit);
  const key = profileCacheKey(libraryId, "artist-spotlights");
  const cached = spotlightCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return sliceItems(cached.items, cap);
  }

  const items = await dedupeInFlight(key, spotlightInFlight, async () => {
    const again = spotlightCache.get(key);
    if (again && again.expires > Date.now()) return again.items;

    const { eligibleIds, artistNames } = await listEligibleArtistIds(config, libraryId);
    const selectedIds = await spotlightRepo.selectLeastRecentlyShown(db, eligibleIds, GROUP_FETCH_SIZE);
    if (cap <= HOME_PREVIEW_LIMIT) {
      await spotlightRepo.markShown(db, selectedIds, new Date());
    }
    const eligible = await loadSpotlightAlbumsForArtists(config, selectedIds, artistNames);
    const result = buildArtistSpotlightTiles(selectedIds, eligible);
    spotlightCache.set(key, { items: result, expires: Date.now() + CACHE_TTL_MS });
    return result;
  });

  return sliceItems(items, cap);
}

const ARTIST_CHILD_COUNT_PROBE_CAP = 30;

/** Eligibility from artist list metadata only — no per-artist album fetches until after selection. */
async function listEligibleArtistIds(
  config: PlexConfig,
  libraryId: string,
): Promise<{ eligibleIds: string[]; artistNames: Map<string, string> }> {
  const artists: plexClient.PlexArtistEntry[] = [];
  const pageSize = 100;
  let start = 0;
  let total = Infinity;

  while (artists.length < FALLBACK_SCAN_CAP && start < total) {
    const { items, total: t } = await plexClient.fetchArtistsPage(config, libraryId, {
      start,
      size: pageSize,
    });
    total = t;
    if (!items.length) break;
    artists.push(...items);
    start += pageSize;
  }

  const eligibleIds: string[] = [];
  const artistNames = new Map<string, string>();
  const needsProbe: plexClient.PlexArtistEntry[] = [];

  for (const artist of artists.slice(0, FALLBACK_SCAN_CAP)) {
    artistNames.set(artist.id, artist.title);
    const count = artist.childCount;
    if (count !== undefined) {
      if (count > 2) eligibleIds.push(artist.id);
      continue;
    }
    needsProbe.push(artist);
  }

  const probed = await Promise.all(
    needsProbe.slice(0, ARTIST_CHILD_COUNT_PROBE_CAP).map(async (artist) => {
      const albums = await plexClient.fetchArtistAlbums(config, artist.id);
      return { artist, albumCount: albums.length };
    }),
  );
  for (const { artist, albumCount } of probed) {
    if (albumCount > 2) eligibleIds.push(artist.id);
  }

  return { eligibleIds, artistNames };
}

async function loadSpotlightAlbumsForArtists(
  config: PlexConfig,
  selectedIds: string[],
  artistNames: Map<string, string>,
): Promise<Map<string, { name: string; albums: AlbumWithStats[] }>> {
  const eligible = new Map<string, { name: string; albums: AlbumWithStats[] }>();
  const loaded = await Promise.all(
    selectedIds.map(async (artistId) => {
      const albums = await plexClient.fetchArtistAlbums(config, artistId);
      return { artistId, albums };
    }),
  );
  for (const { artistId, albums } of loaded) {
    if (albums.length <= 2) continue;
    const entry = getEligibleArtistIds(
      albums.map((album) => ({
        ...album,
        artistId,
        artist: artistNames.get(artistId) ?? album.artist,
      })),
    );
    const picked = entry.get(artistId);
    if (picked) eligible.set(artistId, picked);
  }
  return eligible;
}

export async function getProfileAlbums(
  profile: LibraryQueryProfile,
  config: PlexConfig,
  libraryId: string,
  limit: number,
): Promise<AlbumWithStats[]> {
  const loaders: Record<
    LibraryQueryProfile,
    (c: PlexConfig, l: string) => Promise<AlbumWithStats[]>
  > = {
    "recently-added": loadRecentlyAddedProfile,
    "recently-played": loadRecentlyPlayedProfile,
    "hidden-gems": loadHiddenGemsProfile,
    "random-picks": loadRandomPicksProfile,
  };
  const items = await loaders[profile](config, libraryId);
  return sliceItems(items, limit);
}
