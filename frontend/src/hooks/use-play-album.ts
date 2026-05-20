import { useCallback } from "react";
import { api } from "@/services/api-client";
import { usePlayNow } from "@/hooks/use-play-now";

export function usePlayAlbum() {
  const playNow = usePlayNow();

  return useCallback(
    async (albumId: string) => {
      const tracks = await api.getAlbumTracks(albumId);
      playNow(tracks);
    },
    [playNow],
  );
}
