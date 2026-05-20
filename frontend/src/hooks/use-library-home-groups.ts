import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  Album,
  AlbumGroupResponse,
  AlbumGroupsResponse,
  ArtistSpotlight,
  ArtistSpotlightGroupResponse,
} from "@dexaudio/shared-types";
import { api } from "@/services/api-client";

type GroupQueryResult = UseQueryResult<AlbumGroupResponse | ArtistSpotlightGroupResponse>;

function groupSlice(
  query: UseQueryResult<AlbumGroupsResponse>,
  pick: (data: AlbumGroupsResponse) => Album[] | ArtistSpotlight[],
): GroupQueryResult {
  return {
    data: query.data ? { items: pick(query.data) } : undefined,
    isPending: query.isPending,
    isError: query.isError,
    isSuccess: query.isSuccess,
    isFetched: query.isFetched,
    isFetching: query.isFetching,
    refetch: query.refetch,
  } as GroupQueryResult;
}

/** One batched fetch for the home page (single Plex library load on the server). */
export function useLibraryHomeGroups(libraryId: string) {
  const query = useQuery({
    queryKey: ["library-home-groups", libraryId],
    queryFn: () => api.getAlbumGroups(libraryId),
    enabled: !!libraryId,
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const recentlyPlayed = groupSlice(query, (d) => d.recentlyPlayed);
  const recentlyAdded = groupSlice(query, (d) => d.recentlyAdded);
  const hiddenGems = groupSlice(query, (d) => d.hiddenGems);
  const randomPicks = groupSlice(query, (d) => d.randomPicks);
  const artistSpotlights = groupSlice(query, (d) => d.artistSpotlights);

  const queries = [recentlyPlayed, recentlyAdded, hiddenGems, randomPicks, artistSpotlights];
  const anyPending = query.isPending;
  const allFetched = query.isFetched;
  const hasAlbums = queries.some((q) => (q.data?.items?.length ?? 0) > 0);
  const onlyEmptySuccess =
    allFetched &&
    !hasAlbums &&
    query.isSuccess &&
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
