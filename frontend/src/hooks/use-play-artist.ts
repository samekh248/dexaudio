import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Album } from "@dexaudio/shared-types";
import { api } from "@/services/api-client";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

function sortArtistAlbums(albums: Album[]): Album[] {
  return [...albums].sort((a, b) => {
    const yearA = a.year ?? Number.MAX_SAFE_INTEGER;
    const yearB = b.year ?? Number.MAX_SAFE_INTEGER;
    if (yearA !== yearB) return yearA - yearB;
    const titleCmp = a.title.localeCompare(b.title);
    if (titleCmp !== 0) return titleCmp;
    return a.id.localeCompare(b.id);
  });
}

export function usePlayArtist() {
  const navigate = useNavigate();
  const playNow = usePlaybackQueue((s) => s.playNow);

  return useCallback(
    async (artistId: string) => {
      const albums = sortArtistAlbums(await api.getArtistAlbums(artistId));
      const trackLists = await Promise.all(albums.map((a) => api.getAlbumTracks(a.id)));
      const tracks = trackLists.flat();
      if (tracks.length === 0) return;
      playNow(tracks);
      navigate("/now-playing");
    },
    [navigate, playNow],
  );
}
