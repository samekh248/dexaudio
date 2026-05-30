import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Track } from "@dexaudio/shared-types";
import { getPlayNavigationMode } from "@/lib/local-storage";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

/** Replace the queue; navigate to Now Playing when preference is `navigate` (playback starts via PlayerProvider). */
export function usePlayNow() {
  const navigate = useNavigate();
  const playNow = usePlaybackQueue((s) => s.playNow);

  return useCallback(
    (tracks: Track[]) => {
      playNow(tracks);
      if (getPlayNavigationMode() === "navigate") {
        navigate("/now-playing");
      }
    },
    [navigate, playNow],
  );
}
