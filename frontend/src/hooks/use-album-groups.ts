import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";

export function useAlbumGroups(libraryId: string) {
  return useQuery({
    queryKey: ["album-groups", libraryId],
    queryFn: () => api.getAlbumGroups(libraryId),
    enabled: !!libraryId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
