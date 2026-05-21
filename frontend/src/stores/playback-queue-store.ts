import { create } from "zustand";
import type { Track } from "@dexaudio/shared-types";
import { getItem, StorageKeys } from "@/lib/local-storage";
import {
  saveSnapshot,
  type PlaybackSessionSnapshot,
  type PersistedQueueItem,
} from "@/lib/playback-session";

export type QueueSource = "user" | "auto";

export interface QueueItem {
  track: Track;
  source: QueueSource;
}

interface PlaybackQueueState {
  items: QueueItem[];
  currentIndex: number;
  skippedIndices: Set<number>;
  loadGeneration: number;
  playbackStarted: boolean;
  hydrated: boolean;
  restorePhase: boolean;
  restoredElapsedMs: number;
  playNow: (tracks: Track[]) => void;
  addToQueue: (tracks: Track[]) => void;
  addAutoTracks: (tracks: Track[]) => void;
  removeAt: (index: number) => void;
  reorder: (from: number, to: number) => void;
  next: () => void;
  previous: () => void;
  setIndex: (index: number) => void;
  clearAutoItems: () => void;
  markSkipped: (index: number) => void;
  resetSkipped: () => void;
  markPlaybackStarted: () => void;
  exitRestorePhase: () => void;
  hydrateFromSnapshot: (snapshot: PlaybackSessionSnapshot | null) => void;
}

const QUEUE_ONLY_INDEX = -1;

function buildSnapshotFromState(state: PlaybackQueueState, elapsedMs?: number): PlaybackSessionSnapshot | null {
  const libraryId = getItem(StorageKeys.activeLibraryId, "");
  if (!libraryId) return null;

  const items: PersistedQueueItem[] = state.items.map((i) => ({
    track: i.track,
    source: i.source,
  }));

  const currentIndex =
    state.playbackStarted && state.currentIndex >= 0 && state.items.length > 0
      ? state.currentIndex
      : null;

  return {
    schemaVersion: 1,
    libraryId,
    items,
    currentIndex,
    ...(currentIndex !== null && elapsedMs !== undefined ? { elapsedMs } : {}),
    savedAt: new Date().toISOString(),
  };
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersistedElapsedMs: number | undefined;

function schedulePersist(getState: () => PlaybackQueueState, elapsedMs?: number) {
  if (persistTimer) clearTimeout(persistTimer);
  if (elapsedMs !== undefined) lastPersistedElapsedMs = elapsedMs;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const snapshot = buildSnapshotFromState(getState(), lastPersistedElapsedMs);
    if (snapshot) saveSnapshot(snapshot);
  }, 300);
}

export function persistPlaybackSessionNow(elapsedMs?: number): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (elapsedMs !== undefined) lastPersistedElapsedMs = elapsedMs;
  const snapshot = buildSnapshotFromState(usePlaybackQueue.getState(), lastPersistedElapsedMs);
  if (snapshot) saveSnapshot(snapshot);
}

export const usePlaybackQueue = create<PlaybackQueueState>((set, get) => ({
  items: [],
  currentIndex: 0,
  skippedIndices: new Set<number>(),
  loadGeneration: 0,
  playbackStarted: false,
  hydrated: false,
  restorePhase: false,
  restoredElapsedMs: 0,

  markPlaybackStarted: () => {
    set({ playbackStarted: true });
    schedulePersist(get);
  },

  exitRestorePhase: () => set({ restorePhase: false }),

  hydrateFromSnapshot: (snapshot) => {
    if (!snapshot || snapshot.items.length === 0) {
      set({ hydrated: true, restorePhase: false, playbackStarted: false });
      return;
    }

    const items = snapshot.items.map((i) => ({
      track: i.track,
      source: i.source,
    }));

    if (snapshot.currentIndex === null) {
      set({
        items,
        currentIndex: QUEUE_ONLY_INDEX,
        skippedIndices: new Set(),
        playbackStarted: false,
        restorePhase: false,
        restoredElapsedMs: 0,
        hydrated: true,
      });
      return;
    }

    const elapsedMs = snapshot.elapsedMs ?? 0;
    set({
      items,
      currentIndex: snapshot.currentIndex,
      skippedIndices: new Set(),
      playbackStarted: true,
      restorePhase: true,
      restoredElapsedMs: elapsedMs,
      hydrated: true,
    });
  },

  playNow: (tracks) => {
    const userItems = get().items.filter((i) => i.source === "user");
    const newItems: QueueItem[] = [
      ...tracks.map((t) => ({ track: t, source: "user" as const })),
      ...userItems,
    ];
    set((s) => ({
      items: newItems,
      currentIndex: 0,
      skippedIndices: new Set(),
      loadGeneration: s.loadGeneration + 1,
      playbackStarted: true,
      restorePhase: false,
    }));
    schedulePersist(get);
  },

  markSkipped: (index) => {
    set((s) => {
      const skippedIndices = new Set(s.skippedIndices);
      skippedIndices.add(index);
      return { skippedIndices };
    });
  },

  resetSkipped: () => set({ skippedIndices: new Set() }),

  addToQueue: (tracks) => {
    set((s) => ({
      items: [
        ...s.items,
        ...tracks.map((t) => ({ track: t, source: "user" as const })),
      ],
    }));
    schedulePersist(get);
  },

  addAutoTracks: (tracks) => {
    set((s) => ({
      items: [
        ...s.items,
        ...tracks.map((t) => ({ track: t, source: "auto" as const })),
      ],
    }));
    schedulePersist(get);
  },

  removeAt: (index) => {
    set((s) => {
      const items = s.items.filter((_, i) => i !== index);
      let currentIndex = s.currentIndex;
      if (currentIndex === QUEUE_ONLY_INDEX) {
        currentIndex = items.length > 0 ? QUEUE_ONLY_INDEX : 0;
      } else {
        currentIndex = Math.min(s.currentIndex, Math.max(0, items.length - 1));
      }
      return { items, currentIndex };
    });
    schedulePersist(get);
  },

  reorder: (from, to) => {
    set((s) => {
      const items = [...s.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { items };
    });
    schedulePersist(get);
  },

  next: () => {
    const { currentIndex, items, playbackStarted } = get();
    if (!playbackStarted || currentIndex < 0) return;
    if (currentIndex < items.length - 1) {
      set({ currentIndex: currentIndex + 1 });
      schedulePersist(get);
    }
  },

  previous: () => {
    const { currentIndex, playbackStarted } = get();
    if (!playbackStarted || currentIndex <= 0) return;
    set({ currentIndex: currentIndex - 1 });
    schedulePersist(get);
  },

  setIndex: (index) => {
    set({ currentIndex: index, playbackStarted: true, restorePhase: false });
    schedulePersist(get);
  },

  clearAutoItems: () => {
    set((s) => ({
      items: s.items.filter((i) => i.source === "user"),
      currentIndex: 0,
    }));
    schedulePersist(get);
  },
}));

export function getQueueCurrentTrack(state: PlaybackQueueState): Track | undefined {
  if (!state.playbackStarted || state.currentIndex < 0) return undefined;
  return state.items[state.currentIndex]?.track;
}

export function initPlaybackPersistence(): () => void {
  const unsub = usePlaybackQueue.subscribe((state, prev) => {
    if (!state.hydrated) return;
    if (
      state.items !== prev.items ||
      state.currentIndex !== prev.currentIndex ||
      state.playbackStarted !== prev.playbackStarted
    ) {
      schedulePersist(usePlaybackQueue.getState);
    }
  });

  const onPageHide = () => persistPlaybackSessionNow(lastPersistedElapsedMs);
  window.addEventListener("pagehide", onPageHide);

  return () => {
    unsub();
    window.removeEventListener("pagehide", onPageHide);
    if (persistTimer) clearTimeout(persistTimer);
  };
}

export { QUEUE_ONLY_INDEX };

export function queueReducerPlayNow(
  items: QueueItem[],
  tracks: Track[],
): QueueItem[] {
  const userItems = items.filter((i) => i.source === "user");
  return [
    ...tracks.map((t) => ({ track: t, source: "user" as const })),
    ...userItems,
  ];
}

export function queueReducerAdd(items: QueueItem[], tracks: Track[]): QueueItem[] {
  return [...items, ...tracks.map((t) => ({ track: t, source: "user" as const }))];
}
