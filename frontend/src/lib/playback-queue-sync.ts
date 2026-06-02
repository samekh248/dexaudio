import type { Track } from "@dexaudio/shared-types";

import {
  getQueueCurrentTrack,
  usePlaybackQueue,
  type PlaybackQueueState,
} from "@/stores/playback-queue-store";

export type PlaybackQueueSyncDeps = {
  getActiveTrackId: () => string | null;
  loadTrack: (track: Track) => void | Promise<void>;
  seek: (ms: number) => void;
  onWillLoadTrack: () => void;
  onQueueStateChange?: (state: PlaybackQueueState, prev: PlaybackQueueState) => void;
};

/**
 * Keeps the audio engine aligned with the queue index without waiting for a React
 * render. Background tabs throttle/defer effects, which previously blocked auto-advance.
 */
export function subscribePlaybackQueueSync(deps: PlaybackQueueSyncDeps): () => void {
  return usePlaybackQueue.subscribe((state, prev) => {
    if (!state.hydrated || state.restorePhase) return;

    const track = getQueueCurrentTrack(state);
    if (!track) return;

    const indexChanged = state.currentIndex !== prev.currentIndex;
    const generationChanged = state.loadGeneration !== prev.loadGeneration;
    if (!indexChanged && !generationChanged) return;

    deps.onQueueStateChange?.(state, prev);

    const activeId = deps.getActiveTrackId();
    if (activeId === track.id) {
      if (generationChanged) deps.seek(0);
      return;
    }

    deps.onWillLoadTrack();
    void deps.loadTrack(track);
  });
}
