import { useQuery } from "@tanstack/react-query";
import type { LibraryGroupKey } from "@dexaudio/shared-types";
import { api } from "@/services/api-client";

export function useAlbumGroup(libraryId: string, groupKey: LibraryGroupKey, limit = 10) {
  return useQuery({
    queryKey: ["album-group", groupKey, libraryId, limit],
    queryFn: () => api.getAlbumGroup(libraryId, groupKey, limit),
    enabled: !!libraryId,
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
