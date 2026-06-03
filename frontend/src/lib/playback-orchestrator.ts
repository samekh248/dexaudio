import type { Track, TrackFormat } from "@dexaudio/shared-types";

import { getQueuePrepDepth, getTransitionStyle } from "@/lib/playback-prefs-store";
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
  cancelStagedOutside?: (keepTrackIds: string[]) => void;
};

type TerminalReason = "ended" | "failed";

const LOSSLESS_FORMATS = new Set<TrackFormat>(["flac", "alac"]);
const LOSSLESS_EARLY_PRELOAD_RATIO = 0.5;

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

export function forwardTrackIdsForState(state: PlaybackQueueState): string[] {
  const depth = getQueuePrepDepth();
  const ids: string[] = [];
  for (let i = 1; i <= depth; i++) {
    const id = state.items[state.currentIndex + i]?.track.id;
    if (id) ids.push(id);
  }
  return ids;
}

/** Preload up to queuePrepDepth upcoming tracks (all transition modes). */
export function preloadForwardDepth(state: PlaybackQueueState): void {
  if (!bridge || !state.playbackStarted || state.restorePhase) return;
  const depth = getQueuePrepDepth();
  if (depth < 1) return;

  const current = getQueueCurrentTrack(state);
  if (!current || bridge.getActiveTrackId() !== current.id) return;

  const keepIds = forwardTrackIdsForState(state);
  bridge.cancelStagedOutside?.(keepIds);

  for (let i = 1; i <= depth; i++) {
    const track = state.items[state.currentIndex + i]?.track;
    if (track) bridge.preloadForward(track);
  }
}

function preloadNeighbors(state: PlaybackQueueState): void {
  if (!bridge || !state.playbackStarted || state.restorePhase) return;
  if (state.currentIndex === lastPreloadIndex) return;
  lastPreloadIndex = state.currentIndex;

  preloadForwardDepth(state);

  const style = getTransitionStyle();
  if (style !== "gapless" && style !== "crossfade") return;

  const prevTrack = state.items[state.currentIndex - 1]?.track;
  if (prevTrack) bridge.preloadBackward(prevTrack);
}

function runPreCache(state: PlaybackQueueState): void {
  if (!bridge || !state.playbackStarted || state.restorePhase) return;
  if (!bridge.isFromCache()) return;
  const tracks = state.items.map((i) => i.track);
  const generation = bumpPreCacheGeneration();
  void runPreCacheForPlayback(tracks, state.currentIndex, generation);
}

function prefetchNextCachedTrack(state: PlaybackQueueState): void {
  if (!bridge || !state.playbackStarted || state.restorePhase) return;
  if (!bridge.isFromCache()) return;
  preloadForwardDepth(state);
}

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

  const nextFormat = state.items[state.currentIndex + 1]?.track.format;
  if (
    nextFormat &&
    LOSSLESS_FORMATS.has(nextFormat) &&
    positionMs >= durationMs * LOSSLESS_EARLY_PRELOAD_RATIO
  ) {
    preloadForwardDepth(state);
  }

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

  preloadForwardDepth(state);
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
        (indexChanged || itemsChanged || generationChanged)
      ) {
        preloadForwardDepth(state);
      }

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
