import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePlayerState } from "@/hooks/use-player";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

type PlayerState = ReturnType<typeof usePlayerState>;

const PlayerContext = createContext<PlayerState | null>(null);

/** Keeps the audio engine in sync with the queue on every route. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = usePlayerState();
  const current = usePlaybackQueue((s) => s.items[s.currentIndex]?.track);
  const loadGeneration = usePlaybackQueue((s) => s.loadGeneration);

  useEffect(() => {
    if (!current) return;
    void player.loadTrack(current, () => {
      usePlaybackQueue.getState().next();
    });
  }, [current?.id, loadGeneration]);

  return <PlayerContext.Provider value={player}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
}
