import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePlayerState } from "@/hooks/use-player";
import { usePlaybackQueue } from "@/stores/playback-queue-store";
import { bumpPreCacheGeneration, runPreCacheForPlayback } from "@/lib/pre-cache-worker";
import { isGaplessPlaybackEnabled } from "@/lib/local-storage";

type PlayerState = ReturnType<typeof usePlayerState>;

const PlayerContext = createContext<PlayerState | null>(null);

/** Keeps the audio engine in sync with the queue on every route. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = usePlayerState();
  const current = usePlaybackQueue((s) => s.items[s.currentIndex]?.track);
  const currentIndex = usePlaybackQueue((s) => s.currentIndex);
  const items = usePlaybackQueue((s) => s.items);
  const loadGeneration = usePlaybackQueue((s) => s.loadGeneration);

  const advanceQueue = useCallback(() => {
    usePlaybackQueue.getState().next();
  }, []);

  const onTrackEnd = useCallback(() => {
    if (!player.tryHandoffForward()) {
      if (import.meta.env.DEV) {
        console.debug("[gapless] end-of-track: fallback to queue load");
      }
    }
    advanceQueue();
  }, [player, advanceQueue]);

  const onTrackEndRef = useRef(onTrackEnd);
  onTrackEndRef.current = onTrackEnd;

  useEffect(() => {
    if (!current) return;
    const tracks = items.map((i) => i.track);
    const generation = bumpPreCacheGeneration();
    void runPreCacheForPlayback(tracks, currentIndex, generation);
  }, [current?.id, currentIndex, items.length, loadGeneration]);

  useEffect(() => {
    if (!current) return;
    if (player.getActiveTrackId() === current.id) return;
    void player.loadTrack(current, () => onTrackEndRef.current());
  }, [current?.id, loadGeneration, player]);

  // Preload neighbors only after the current track is actually playing (avoids racing loadTrack).
  useEffect(() => {
    if (!current || player.loading || !player.playing) return;
    if (player.getActiveTrackId() !== current.id) return;
    if (!isGaplessPlaybackEnabled()) return;

    const nextTrack = items[currentIndex + 1]?.track;
    const prevTrack = items[currentIndex - 1]?.track;
    if (nextTrack) {
      player.preloadForward(nextTrack, () => onTrackEndRef.current());
    }
    if (prevTrack) {
      player.preloadBackward(prevTrack, () => onTrackEndRef.current());
    }
  }, [
    current?.id,
    currentIndex,
    items.length,
    loadGeneration,
    player.loading,
    player.playing,
    player.getActiveTrackId,
    player.preloadForward,
    player.preloadBackward,
  ]);

  return <PlayerContext.Provider value={player}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
}
