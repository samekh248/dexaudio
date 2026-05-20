import { create } from "zustand";
import type { Track } from "@dexaudio/shared-types";

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
}

export const usePlaybackQueue = create<PlaybackQueueState>((set, get) => ({
  items: [],
  currentIndex: 0,
  skippedIndices: new Set<number>(),
  loadGeneration: 0,

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
    }));
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
  },

  addAutoTracks: (tracks) => {
    set((s) => ({
      items: [
        ...s.items,
        ...tracks.map((t) => ({ track: t, source: "auto" as const })),
      ],
    }));
  },

  removeAt: (index) => {
    set((s) => {
      const items = s.items.filter((_, i) => i !== index);
      const currentIndex = Math.min(s.currentIndex, Math.max(0, items.length - 1));
      return { items, currentIndex };
    });
  },

  reorder: (from, to) => {
    set((s) => {
      const items = [...s.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { items };
    });
  },

  next: () => {
    const { currentIndex, items } = get();
    if (currentIndex < items.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  previous: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  setIndex: (index) => set({ currentIndex: index }),

  clearAutoItems: () => {
    set((s) => ({
      items: s.items.filter((i) => i.source === "user"),
      currentIndex: 0,
    }));
  },
}));

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
