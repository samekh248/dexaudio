import { beforeEach, describe, expect, it, vi } from "vitest";
import { subscribePlaybackQueueSync } from "@/lib/playback-queue-sync";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

const track = (id: string) => ({
  id,
  title: `Track ${id}`,
  artist: "Artist",
  album: "Album",
  durationMs: 180_000,
  format: "mp3" as const,
});

describe("subscribePlaybackQueueSync", () => {
  const loadTrack = vi.fn();
  const seek = vi.fn();
  const onWillLoadTrack = vi.fn();
  let activeId: string | null = "t1";

  beforeEach(() => {
    vi.clearAllMocks();
    activeId = "t1";
    usePlaybackQueue.setState({
      items: [track("t1"), track("t2")].map((t) => ({ track: t, source: "user" as const })),
      currentIndex: 0,
      playbackStarted: true,
      restorePhase: false,
      restoredElapsedMs: 0,
      hydrated: true,
      skippedIndices: new Set(),
      failedIndices: new Set(),
      loadGeneration: 0,
    });
  });

  it("loads the new track when the queue index changes", () => {
    const unsub = subscribePlaybackQueueSync({
      getActiveTrackId: () => activeId,
      loadTrack,
      seek,
      onWillLoadTrack,
    });

    usePlaybackQueue.getState().next();
    activeId = "t2";

    expect(onWillLoadTrack).toHaveBeenCalledTimes(1);
    expect(loadTrack).toHaveBeenCalledWith(track("t2"));

    unsub();
  });

  it("does not load while restore phase is active", () => {
    usePlaybackQueue.setState({ restorePhase: true });
    const unsub = subscribePlaybackQueueSync({
      getActiveTrackId: () => activeId,
      loadTrack,
      seek,
      onWillLoadTrack,
    });

    usePlaybackQueue.getState().next();

    expect(loadTrack).not.toHaveBeenCalled();
    unsub();
  });

  it("seeks to start when load generation changes for the same track", () => {
    const unsub = subscribePlaybackQueueSync({
      getActiveTrackId: () => "t1",
      loadTrack,
      seek,
      onWillLoadTrack,
    });

    usePlaybackQueue.setState((s) => ({ loadGeneration: s.loadGeneration + 1 }));

    expect(seek).toHaveBeenCalledWith(0);
    expect(loadTrack).not.toHaveBeenCalled();
    unsub();
  });
});
