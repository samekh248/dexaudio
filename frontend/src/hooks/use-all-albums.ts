import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";

export function useAllAlbums(libraryId: string) {
  return useQuery({
    queryKey: ["all-albums", libraryId],
    queryFn: () => api.getAllAlbums(libraryId),
    enabled: !!libraryId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
