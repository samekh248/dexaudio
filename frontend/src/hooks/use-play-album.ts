import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api-client";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

export function usePlayAlbum() {
  const navigate = useNavigate();
  const playNow = usePlaybackQueue((s) => s.playNow);

  return useCallback(
    async (albumId: string) => {
      const tracks = await api.getAlbumTracks(albumId);
      playNow(tracks);
      navigate("/now-playing");
    },
    [navigate, playNow],
  );
}
