import { create } from "zustand";

export type PrepStatus = "idle" | "loading" | "ready" | "error";

export type TrackPrepState = {
  status: PrepStatus;
  progressRatio: number | null;
};

type QueuePrepStore = {
  byTrackId: Record<string, TrackPrepState>;
  setTrackPrep: (trackId: string, state: TrackPrepState) => void;
  clearTrackPrep: (trackId: string) => void;
  clearAllExcept: (trackIds: string[]) => void;
};

const IDLE: TrackPrepState = { status: "idle", progressRatio: null };

export const useQueuePrepStore = create<QueuePrepStore>((set, get) => ({
  byTrackId: {},

  setTrackPrep(trackId, state) {
    set((s) => ({
      byTrackId: { ...s.byTrackId, [trackId]: state },
    }));
  },

  clearTrackPrep(trackId) {
    set((s) => {
      const next = { ...s.byTrackId };
      delete next[trackId];
      return { byTrackId: next };
    });
  },

  clearAllExcept(trackIds) {
    const keep = new Set(trackIds);
    set((s) => {
      const next: Record<string, TrackPrepState> = {};
      for (const [id, state] of Object.entries(s.byTrackId)) {
        if (keep.has(id)) next[id] = state;
      }
      return { byTrackId: next };
    });
  },
}));

export function setTrackPrep(trackId: string, state: TrackPrepState): void {
  useQueuePrepStore.getState().setTrackPrep(trackId, state);
}

export function clearTrackPrep(trackId: string): void {
  useQueuePrepStore.getState().clearTrackPrep(trackId);
}

export function clearAllExcept(trackIds: string[]): void {
  useQueuePrepStore.getState().clearAllExcept(trackIds);
}

export function useTrackPrep(trackId: string): TrackPrepState {
  return useQueuePrepStore((s) => s.byTrackId[trackId] ?? IDLE);
}

export function getTrackPrep(trackId: string): TrackPrepState {
  return useQueuePrepStore.getState().byTrackId[trackId] ?? IDLE;
}
