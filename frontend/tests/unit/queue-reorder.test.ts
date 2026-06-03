import { beforeEach, describe, expect, it } from "vitest";
import { usePlaybackQueue } from "@/stores/playback-queue-store";
import type { Track } from "@dexaudio/shared-types";

const track = (id: string): Track => ({
  id,
  title: id,
  artist: "A",
  album: "B",
  durationMs: 1000,
  format: "mp3",
});

describe("reorderUpcoming", () => {
  beforeEach(() => {
    usePlaybackQueue.setState({
      items: [],
      currentIndex: 0,
      playbackStarted: false,
      hydrated: false,
      restorePhase: false,
      restoredElapsedMs: 0,
      skippedIndices: new Set(),
      failedIndices: new Set(),
      loadGeneration: 0,
    });
  });

  it("reorders only after current index and keeps currentIndex", () => {
    usePlaybackQueue.getState().playNow([track("1"), track("2"), track("3"), track("4")]);
    usePlaybackQueue.getState().setIndex(1);
    usePlaybackQueue.getState().reorderUpcoming(3, 2);
    const state = usePlaybackQueue.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.items.map((i) => i.track.id)).toEqual(["1", "2", "4", "3"]);
  });

  it("no-ops when from or to is at or before current", () => {
    usePlaybackQueue.getState().playNow([track("1"), track("2"), track("3")]);
    usePlaybackQueue.getState().setIndex(1);
    const before = usePlaybackQueue.getState().items.map((i) => i.track.id);
    usePlaybackQueue.getState().reorderUpcoming(1, 2);
    usePlaybackQueue.getState().reorderUpcoming(0, 2);
    expect(usePlaybackQueue.getState().items.map((i) => i.track.id)).toEqual(before);
  });
});
