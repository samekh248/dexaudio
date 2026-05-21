import { beforeEach, describe, expect, it } from "vitest";
import { usePlaybackQueue } from "@/stores/playback-queue-store";
import type { Track } from "@dexaudio/shared-types";
import type { PlaybackSessionSnapshot } from "@/lib/playback-session";

const track = (id: string): Track => ({
  id,
  title: id,
  artist: "A",
  album: "B",
  durationMs: 1000,
  format: "mp3",
});

function snapshot(overrides: Partial<PlaybackSessionSnapshot> = {}): PlaybackSessionSnapshot {
  return {
    schemaVersion: 1,
    libraryId: "lib",
    items: [],
    currentIndex: null,
    savedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("playback queue store", () => {
  beforeEach(() => {
    usePlaybackQueue.setState({
      items: [],
      currentIndex: 0,
      playbackStarted: false,
      hydrated: false,
      restorePhase: false,
      restoredElapsedMs: 0,
      skippedIndices: new Set(),
      loadGeneration: 0,
    });
  });

  it("adds and removes queue items", () => {
    usePlaybackQueue.getState().addToQueue([track("1")]);
    expect(usePlaybackQueue.getState().items).toHaveLength(1);
    usePlaybackQueue.getState().removeAt(0);
    expect(usePlaybackQueue.getState().items).toHaveLength(0);
  });

  it("reorders items", () => {
    usePlaybackQueue.getState().addToQueue([track("1"), track("2")]);
    usePlaybackQueue.getState().reorder(0, 1);
    expect(usePlaybackQueue.getState().items[0].track.id).toBe("2");
  });

  it("navigates next and previous", () => {
    usePlaybackQueue.getState().playNow([track("1"), track("2")]);
    usePlaybackQueue.getState().next();
    expect(usePlaybackQueue.getState().currentIndex).toBe(1);
    usePlaybackQueue.getState().previous();
    expect(usePlaybackQueue.getState().currentIndex).toBe(0);
  });

  it("play now replaces queue", () => {
    usePlaybackQueue.getState().addAutoTracks([track("auto")]);
    usePlaybackQueue.getState().playNow([track("now")]);
    expect(usePlaybackQueue.getState().items[0].track.id).toBe("now");
    expect(usePlaybackQueue.getState().items.every((i) => i.source === "user")).toBe(true);
  });

  it("play now clears previous album but preserves manually queued items", () => {
    usePlaybackQueue.getState().playNow([track("a1"), track("a2")]);
    usePlaybackQueue.getState().addToQueue([track("manual")]);
    usePlaybackQueue.getState().playNow([track("b1")]);
    expect(usePlaybackQueue.getState().items.map((i) => i.track.id)).toEqual(["b1", "manual"]);
  });

  it("tracks skipped indices", () => {
    usePlaybackQueue.getState().markSkipped(2);
    expect(usePlaybackQueue.getState().skippedIndices.has(2)).toBe(true);
    usePlaybackQueue.getState().resetSkipped();
    expect(usePlaybackQueue.getState().skippedIndices.size).toBe(0);
  });

  it("sets current index directly", () => {
    usePlaybackQueue.getState().addToQueue([track("1"), track("2"), track("3")]);
    usePlaybackQueue.getState().setIndex(2);
    expect(usePlaybackQueue.getState().currentIndex).toBe(2);
  });

  it("clears auto items", () => {
    usePlaybackQueue.setState({
      items: [
        { track: track("1"), source: "user" },
        { track: track("2"), source: "auto" },
      ],
      currentIndex: 0,
    });
    usePlaybackQueue.getState().clearAutoItems();
    expect(usePlaybackQueue.getState().items).toHaveLength(1);
  });

  describe("hydrateFromSnapshot", () => {
    it("restores items order and source", () => {
      usePlaybackQueue.getState().hydrateFromSnapshot(
        snapshot({
          items: [
            { track: track("1"), source: "user" },
            { track: track("2"), source: "auto" },
          ],
          currentIndex: null,
        }),
      );
      const state = usePlaybackQueue.getState();
      expect(state.items.map((i) => i.track.id)).toEqual(["1", "2"]);
      expect(state.items[1].source).toBe("auto");
      expect(state.playbackStarted).toBe(false);
    });

    it("leaves empty queue for null snapshot", () => {
      usePlaybackQueue.getState().hydrateFromSnapshot(null);
      expect(usePlaybackQueue.getState().items).toHaveLength(0);
    });

    it("hydrates current index and restore phase when playback had started", () => {
      usePlaybackQueue.getState().hydrateFromSnapshot(
        snapshot({
          items: [{ track: track("1"), source: "user" }],
          currentIndex: 0,
          elapsedMs: 12_000,
        }),
      );
      const state = usePlaybackQueue.getState();
      expect(state.currentIndex).toBe(0);
      expect(state.playbackStarted).toBe(true);
      expect(state.restorePhase).toBe(true);
      expect(state.restoredElapsedMs).toBe(12_000);
    });

    it("queue-only snapshot does not mark playing", () => {
      usePlaybackQueue.getState().hydrateFromSnapshot(
        snapshot({
          items: [{ track: track("1"), source: "user" }],
          currentIndex: null,
        }),
      );
      expect(usePlaybackQueue.getState().playbackStarted).toBe(false);
      expect(usePlaybackQueue.getState().restorePhase).toBe(false);
    });
  });
});
