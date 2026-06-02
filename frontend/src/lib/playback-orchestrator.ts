import type { Track } from "@dexaudio/shared-types";

import { getTransitionStyle } from "@/lib/playback-prefs-store";
import { bumpPreCacheGeneration, runPreCacheForPlayback } from "@/lib/pre-cache-worker";
import {
  getQueueCurrentTrack,
  usePlaybackQueue,
  type PlaybackQueueState,
} from "@/stores/playback-queue-store";
import { subscribePlaybackQueueSync } from "@/lib/playback-queue-sync";

export type PlaybackOrchestratorBridge = {
  getActiveTrackId: () => string | null;
  loadTrack: (track: Track) => void | Promise<void>;
  seek: (ms: number) => void;
  preloadForward: (track: Track) => void;
  preloadBackward: (track: Track) => void;
  tryHandoffForward: () => boolean;
  isFromCache: () => boolean;
  /** False after the user pauses — blocks auto-advance and unintended resume. */
  isUserPlaybackActive: () => boolean;
  onWillLoadTrack: () => void;
};

type TerminalReason = "ended" | "failed";

let bridge: PlaybackOrchestratorBridge | null = null;
let onFailed: ((reason: TerminalReason) => void) | null = null;
let unsubscribeQueueSync: (() => void) | null = null;
let lastPreloadIndex = -1;
let terminalHandledSig: string | null = null;

const NEAR_END_PRELOAD_RATIO = 0.75;
const GAPLESS_EARLY_HANDOFF_RATIO = 0.97;
const PROGRESS_END_TOLERANCE_MS = 200;

function terminalSignature(reason: TerminalReason): string {
  const state = usePlaybackQueue.getState();
  return `${reason}:${state.loadGeneration}:${state.currentIndex}:${bridge?.getActiveTrackId() ?? ""}`;
}

function clearTerminalDedupe(): void {
  terminalHandledSig = null;
}

function preloadNeighbors(state: PlaybackQueueState): void {
  if (!bridge || !state.playbackStarted || state.restorePhase) return;
  if (state.currentIndex === lastPreloadIndex) return;
  lastPreloadIndex = state.currentIndex;

  const style = getTransitionStyle();
  if (style !== "gapless" && style !== "crossfade") return;

  const current = getQueueCurrentTrack(state);
  if (!current || bridge.getActiveTrackId() !== current.id) return;

  const nextTrack = state.items[state.currentIndex + 1]?.track;
  const prevTrack = state.items[state.currentIndex - 1]?.track;
  if (nextTrack) bridge.preloadForward(nextTrack);
  if (prevTrack) bridge.preloadBackward(prevTrack);
}

function runPreCache(state: PlaybackQueueState): void {
  if (!bridge || !state.playbackStarted || state.restorePhase) return;
  // Only skip look-ahead downloads while the *current* track is an active live stream;
  // still pre-cache upcoming items so the next advance can load from cache in background.
  if (!bridge.isFromCache()) return;
  const tracks = state.items.map((i) => i.track);
  const generation = bumpPreCacheGeneration();
  void runPreCacheForPlayback(tracks, state.currentIndex, generation);
}

/** When the current track is cached, it is safe to fetch the next track into cache during playback. */
function prefetchNextCachedTrack(state: PlaybackQueueState): void {
  if (!bridge || !state.playbackStarted || state.restorePhase) return;
  if (!bridge.isFromCache()) return;
  const nextTrack = state.items[state.currentIndex + 1]?.track;
  if (!nextTrack) return;
  bridge.preloadForward(nextTrack);
}

/**
 * Advance the queue when a track ends. Runs outside React so background-tab
 * throttling does not block auto-advance after the current song finishes.
 */
export function advancePlaybackQueue(reason: TerminalReason): void {
  if (!bridge) return;

  const sig = terminalSignature(reason);
  if (terminalHandledSig === sig) return;
  terminalHandledSig = sig;

  if (reason === "failed") {
    onFailed?.(reason);
    return;
  }

  if (!bridge.isUserPlaybackActive()) return;

  const style = getTransitionStyle();
  if (style === "gapless" || style === "crossfade") {
    if (bridge.tryHandoffForward()) {
      usePlaybackQueue.getState().advanceAfterHandoff("forward");
      return;
    }
  }

  usePlaybackQueue.getState().next();
}

/**
 * Drive gapless preload and background-safe end detection from playback progress.
 * Media `timeupdate` keeps firing in background tabs; Howler's `ended` timers do not.
 */
export function onPlaybackProgressOrchestration(
  trackId: string,
  positionMs: number,
  durationMs: number,
): void {
  if (!bridge || durationMs <= 0) return;

  const state = usePlaybackQueue.getState();
  if (!state.playbackStarted || state.restorePhase) return;
  if (bridge.getActiveTrackId() !== trackId) return;

  const userActive = bridge.isUserPlaybackActive();

  preloadNextTrackIfNearEnd(positionMs, durationMs);
  if (positionMs >= durationMs * NEAR_END_PRELOAD_RATIO) {
    prefetchNextCachedTrack(state);
  }

  if (!userActive) return;

  const style = getTransitionStyle();
  if (style === "gapless" || style === "crossfade") {
    if (positionMs >= durationMs * GAPLESS_EARLY_HANDOFF_RATIO && bridge.tryHandoffForward()) {
      const sig = terminalSignature("ended");
      if (terminalHandledSig !== sig) {
        terminalHandledSig = sig;
        usePlaybackQueue.getState().advanceAfterHandoff("forward");
      }
      return;
    }
  }

  if (positionMs >= durationMs - PROGRESS_END_TOLERANCE_MS) {
    advancePlaybackQueue("ended");
  }
}

export function preloadNextTrackIfNearEnd(positionMs: number, durationMs: number): void {
  if (!bridge || durationMs <= 0) return;
  if (positionMs < durationMs * NEAR_END_PRELOAD_RATIO) return;

  const state = usePlaybackQueue.getState();
  if (!state.playbackStarted || state.restorePhase) return;

  const style = getTransitionStyle();
  if (style !== "gapless" && style !== "crossfade") return;

  const nextTrack = state.items[state.currentIndex + 1]?.track;
  if (nextTrack) bridge.preloadForward(nextTrack);
}

export function registerPlaybackOrchestrator(deps: {
  bridge: PlaybackOrchestratorBridge;
  onFailed: (reason: TerminalReason) => void;
}): () => void {
  bridge = deps.bridge;
  onFailed = deps.onFailed;
  lastPreloadIndex = -1;
  clearTerminalDedupe();

  unsubscribeQueueSync?.();
  const initial = usePlaybackQueue.getState();
  if (initial.playbackStarted && !initial.restorePhase && deps.bridge.isFromCache()) {
    runPreCache(initial);
  }
  if (initial.playbackStarted && !initial.restorePhase) {
    preloadNeighbors(initial);
  }

  unsubscribeQueueSync = subscribePlaybackQueueSync({
    getActiveTrackId: () => bridge!.getActiveTrackId(),
    loadTrack: (track) => bridge!.loadTrack(track),
    seek: (ms) => bridge!.seek(ms),
    onWillLoadTrack: () => {
      clearTerminalDedupe();
      bridge!.onWillLoadTrack();
    },
    onQueueStateChange: (state, prev) => {
      const indexChanged = state.currentIndex !== prev.currentIndex;
      const generationChanged = state.loadGeneration !== prev.loadGeneration;
      const itemsChanged = state.items !== prev.items;
      if (indexChanged) preloadNeighbors(state);
      if (
        state.playbackStarted &&
        !state.restorePhase &&
        (indexChanged || generationChanged || itemsChanged)
      ) {
        runPreCache(state);
      }
    },
  });

  return () => {
    unsubscribeQueueSync?.();
    unsubscribeQueueSync = null;
    bridge = null;
    onFailed = null;
    lastPreloadIndex = -1;
    clearTerminalDedupe();
  };
}
