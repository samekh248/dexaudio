import type { QueueItem } from "@/stores/playback-queue-store";

export const PLAYED_VISIBLE_MAX = 3;

export type QueueRowRef = { item: QueueItem; index: number };

export interface QueueDisplayInput {
  items: QueueItem[];
  currentIndex: number;
  playbackStarted: boolean;
}

export interface QueueDisplaySections {
  played: QueueRowRef[];
  current: QueueRowRef | null;
  upcoming: QueueRowRef[];
  showPlayedSeparator: boolean;
}

export function buildQueueDisplaySections(input: QueueDisplayInput): QueueDisplaySections {
  const { items, currentIndex, playbackStarted } = input;

  if (!playbackStarted || currentIndex < 0) {
    return {
      played: [],
      current: null,
      upcoming: items.map((item, index) => ({ item, index })),
      showPlayedSeparator: false,
    };
  }

  const playedStart = Math.max(0, currentIndex - PLAYED_VISIBLE_MAX);
  const played: QueueRowRef[] = [];
  for (let i = playedStart; i < currentIndex; i++) {
    played.push({ item: items[i]!, index: i });
  }

  const current =
    currentIndex < items.length ? { item: items[currentIndex]!, index: currentIndex } : null;

  const upcoming: QueueRowRef[] = [];
  for (let i = currentIndex + 1; i < items.length; i++) {
    upcoming.push({ item: items[i]!, index: i });
  }

  return {
    played,
    current,
    upcoming,
    showPlayedSeparator: played.length > 0,
  };
}
