import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePlayerState } from "@/hooks/use-player";
import {
  getQueueCurrentTrack,
  usePlaybackQueue,
} from "@/stores/playback-queue-store";
import { bumpPreCacheGeneration, runPreCacheForPlayback } from "@/lib/pre-cache-worker";
import { isGaplessPlaybackEnabled } from "@/lib/local-storage";

type PlayerState = ReturnType<typeof usePlayerState>;

const PlayerContext = createContext<PlayerState | null>(null);

/** Keeps the audio engine in sync with the queue on every route. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = usePlayerState();
  const current = usePlaybackQueue(getQueueCurrentTrack);
  const currentIndex = usePlaybackQueue((s) => s.currentIndex);
  const items = usePlaybackQueue((s) => s.items);
  const loadGeneration = usePlaybackQueue((s) => s.loadGeneration);
  const restorePhase = usePlaybackQueue((s) => s.restorePhase);
  const restoredElapsedMs = usePlaybackQueue((s) => s.restoredElapsedMs);
  const playbackStarted = usePlaybackQueue((s) => s.playbackStarted);

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
  const syncedGenerationRef = useRef(loadGeneration);

  const startPlaybackFromRestore = useCallback(async () => {
    const track = getQueueCurrentTrack(usePlaybackQueue.getState());
    if (!track) return;
    const elapsed = usePlaybackQueue.getState().restoredElapsedMs;
    usePlaybackQueue.getState().exitRestorePhase();
    usePlaybackQueue.getState().markPlaybackStarted();
    await player.loadTrack(track, () => onTrackEndRef.current(), {
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

  useEffect(() => {
    if (!current || !playbackStarted) return;
    const tracks = items.map((i) => i.track);
    const generation = bumpPreCacheGeneration();
    void runPreCacheForPlayback(tracks, currentIndex, generation);
  }, [current?.id, currentIndex, items.length, loadGeneration, playbackStarted]);

  useEffect(() => {
    if (!current || restorePhase) return;

    const prevGeneration = syncedGenerationRef.current;
    const generationChanged = prevGeneration !== loadGeneration;
    syncedGenerationRef.current = loadGeneration;

    const activeId = player.getActiveTrackId();
    if (activeId === current.id) {
      if (generationChanged) {
        player.seek(0);
      }
      return;
    }

    void player.loadTrack(current, () => onTrackEndRef.current());
  }, [current?.id, currentIndex, loadGeneration, player.loadTrack, player.getActiveTrackId, player.seek, restorePhase]);

  useEffect(() => {
    if (!current || player.loading || !player.playing) return;
    if (restorePhase) return;
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
    restorePhase,
  ]);

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
