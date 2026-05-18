import type {
  Album,
  AlbumPage,
  AppSettings,
  DiscogsCollectionItem,
  MatchStatus,
  PlexConnectionInput,
  PlexConnectionPublic,
  PlexLibrary,
  ScrobbleInput,
  SearchResults,
  TopStats,
  Track,
} from "@dexaudio/shared-types";

const API_BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly action?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
      action?: string;
    };
    throw new ApiError(body.message ?? res.statusText, res.status, body.code, body.action);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  getPlexConnection: () => request<PlexConnectionPublic>("/plex/connection"),
  savePlexConnection: (body: PlexConnectionInput) =>
    request<PlexConnectionPublic>("/plex/connection", { method: "PUT", body: JSON.stringify(body) }),
  getLibraries: () => request<PlexLibrary[]>("/plex/libraries"),

  getAlbums: (libraryId: string, page = 1, pageSize = 48) =>
    request<AlbumPage>(`/library/albums?libraryId=${libraryId}&page=${page}&pageSize=${pageSize}`),

  getAlbumTracks: (albumId: string) => request<Track[]>(`/library/albums/${albumId}/tracks`),

  getArtistAlbums: (artistId: string) => request<Album[]>(`/library/artists/${artistId}/albums`),

  search: (q: string) => request<SearchResults>(`/library/search?q=${encodeURIComponent(q)}`),

  getSimilarTracks: (seedTrackId: string, limit = 25) =>
    request<Track[]>(`/playback/similar?seedTrackId=${seedTrackId}&limit=${limit}`),

  getTopStats: () => request<TopStats>("/stats/top"),

  getSettings: () => request<AppSettings>("/settings"),
  patchSettings: (patch: Partial<AppSettings>) =>
    request<AppSettings>("/settings", { method: "PATCH", body: JSON.stringify(patch) }),

  saveDiscogsConnection: (username: string, token: string) =>
    request<{ ok: boolean }>("/discogs/connection", {
      method: "PUT",
      body: JSON.stringify({ username, token }),
    }),

  syncDiscogs: () => request<{ status: string }>("/discogs/sync", { method: "POST" }),

  getDiscogsCollection: (status?: MatchStatus) =>
    request<DiscogsCollectionItem[]>(
      `/discogs/collection${status ? `?status=${status}` : ""}`,
    ),

  patchDiscogsMatch: (
    releaseId: number,
    body: { plexAlbumId?: string | null; status?: MatchStatus },
  ) =>
    request<{ ok: boolean }>(`/discogs/matches/${releaseId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  submitScrobble: (body: ScrobbleInput) =>
    request<{ queued?: boolean }>("/lastfm/scrobbles", { method: "POST", body: JSON.stringify(body) }),

  retryScrobbles: () =>
    request<{ status: string; pending: number }>("/lastfm/scrobbles/retry", { method: "POST" }),
};
