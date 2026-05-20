import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import type {
  Album,
  AlbumGroupResponse,
  ArtistSpotlight,
  ArtistSpotlightGroupResponse,
  LibraryGroupKey,
} from "@dexaudio/shared-types";
import { api } from "@/services/api-client";

const HOME_GROUP_KEYS: LibraryGroupKey[] = [
  "recently-played",
  "recently-added",
  "hidden-gems",
  "random-picks",
  "artist-spotlights",
];

const HOME_PREVIEW_LIMIT = 10;

type GroupQueryResult = UseQueryResult<AlbumGroupResponse | ArtistSpotlightGroupResponse>;

export function useLibraryHomeGroups(libraryId: string) {
  const queries = useQueries({
    queries: HOME_GROUP_KEYS.map((groupKey) => ({
      queryKey: ["album-group", groupKey, libraryId, HOME_PREVIEW_LIMIT] as const,
      queryFn: () => api.getAlbumGroup(libraryId, groupKey, HOME_PREVIEW_LIMIT),
      enabled: !!libraryId,
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    })),
  });

  const [recentlyPlayed, recentlyAdded, hiddenGems, randomPicks, artistSpotlights] =
    queries as GroupQueryResult[];

  const anyPending = queries.some((q) => q.isPending);
  const allFetched = queries.every((q) => q.isFetched);
  const hasAlbums = queries.some((q) => (q.data?.items?.length ?? 0) > 0);
  const onlyEmptySuccess =
    allFetched &&
    !hasAlbums &&
    queries.every((q) => q.isSuccess) &&
    queries.every((q) => (q.data?.items?.length ?? 0) === 0);

  return {
    recentlyPlayed,
    recentlyAdded,
    hiddenGems,
    randomPicks,
    artistSpotlights,
    anyPending,
    allFetched,
    hasAlbums,
    onlyEmptySuccess,
  };
}
