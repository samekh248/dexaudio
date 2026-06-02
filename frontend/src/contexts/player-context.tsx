import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePlayerState } from "@/hooks/use-player";
import {
  getQueueCurrentTrack,
  usePlaybackQueue,
} from "@/stores/playback-queue-store";
import { registerPlaybackOrchestrator } from "@/lib/playback-orchestrator";
import { toast } from "@/components/ui/sonner";

type PlayerState = ReturnType<typeof usePlayerState>;

const PlayerContext = createContext<PlayerState | null>(null);

/** Keeps the audio engine in sync with the queue on every route. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = usePlayerState();
  const current = usePlaybackQueue(getQueueCurrentTrack);
  const restorePhase = usePlaybackQueue((s) => s.restorePhase);
  const restoredElapsedMs = usePlaybackQueue((s) => s.restoredElapsedMs);

  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    return registerPlaybackOrchestrator({
      bridge: {
        getActiveTrackId: () => playerRef.current.getActiveTrackId(),
        loadTrack: (track) => playerRef.current.loadTrack(track),
        seek: (ms) => playerRef.current.seek(ms),
        preloadForward: (track) => playerRef.current.preloadForward(track),
        preloadBackward: (track) => playerRef.current.preloadBackward(track),
        tryHandoffForward: () => playerRef.current.tryHandoffForward(),
        isFromCache: () => playerRef.current.fromCache,
        isUserPlaybackActive: () => playerRef.current.isUserPlaybackActive(),
        onWillLoadTrack: () => {},
      },
      onFailed: (reason) => {
        if (reason !== "failed" || !playerRef.current.error) return;
        const state = usePlaybackQueue.getState();
        const parts = [
          [playerRef.current.error.trackTitle, playerRef.current.error.trackArtist]
            .filter(Boolean)
            .join(" — "),
          playerRef.current.error.technicalDetail,
        ].filter(Boolean);
        toast(playerRef.current.error.message, {
          description: parts.join(" · ") || undefined,
        });
        usePlaybackQueue.getState().markFailed(state.currentIndex);
      },
    });
  }, []);

  const startPlaybackFromRestore = useCallback(async () => {
    const track = getQueueCurrentTrack(usePlaybackQueue.getState());
    if (!track) return;
    const elapsed = usePlaybackQueue.getState().restoredElapsedMs;
    usePlaybackQueue.getState().exitRestorePhase();
    usePlaybackQueue.getState().markPlaybackStarted();
    await player.loadTrack(track, undefined, {
      autoplayOnLoad: true,
      initialSeekMs: elapsed,
    });
  }, [player]);

  const playWithRestore = useCallback(() => {
    if (restorePhase && current) {
      void startPlaybackFromRestore();
      return;
    }
    player.play();
  }, [restorePhase, current, startPlaybackFromRestore, player]);

  const playerWithRestore = {
    ...player,
    play: playWithRestore,
    restoredElapsedMs,
    restorePhase,
  };

  return (
    <PlayerContext.Provider value={playerWithRestore}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerState & { restorePhase: boolean; restoredElapsedMs: number } {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx as PlayerState & { restorePhase: boolean; restoredElapsedMs: number };
}
