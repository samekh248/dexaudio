import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Track } from "@dexaudio/shared-types";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

/** Replace the queue and open Now Playing (playback starts via PlayerProvider). */
export function usePlayNow() {
  const navigate = useNavigate();
  const playNow = usePlaybackQueue((s) => s.playNow);

  return useCallback(
    (tracks: Track[]) => {
      playNow(tracks);
      navigate("/now-playing");
    },
    [navigate, playNow],
  );
}
