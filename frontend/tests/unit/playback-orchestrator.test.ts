import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  advancePlaybackQueue,
  onPlaybackProgressOrchestration,
  registerPlaybackOrchestrator,
} from "@/lib/playback-orchestrator";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

vi.mock("@/lib/playback-prefs-store", () => ({
  getTransitionStyle: () => "gapless",
}));

const track = (id: string) => ({
  id,
  title: `Track ${id}`,
  artist: "Artist",
  album: "Album",
  durationMs: 100_000,
  format: "mp3" as const,
});

describe("playback orchestrator", () => {
  const loadTrack = vi.fn();
  const tryHandoffForward = vi.fn(() => false);
  const next = vi.fn();
  const advanceAfterHandoff = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    tryHandoffForward.mockReturnValue(false);
    usePlaybackQueue.setState({
      items: [track("t1"), track("t2")].map((t) => ({ track: t, source: "user" as const })),
      currentIndex: 0,
      playbackStarted: true,
      restorePhase: false,
      hydrated: true,
      skippedIndices: new Set(),
      failedIndices: new Set(),
      loadGeneration: 0,
      next,
      advanceAfterHandoff,
    });
  });

  it("advances the queue on terminal without React", () => {
    const unregister = registerPlaybackOrchestrator({
      bridge: {
        getActiveTrackId: () => "t1",
        loadTrack,
        seek: vi.fn(),
        preloadForward: vi.fn(),
        preloadBackward: vi.fn(),
        tryHandoffForward,
        isFromCache: () => true,
        onWillLoadTrack: vi.fn(),
      },
      onFailed: vi.fn(),
    });

    advancePlaybackQueue("ended");
    expect(next).toHaveBeenCalledTimes(1);

    unregister();
  });

  it("gapless handoffs when progress nears the end and a staged track is ready", () => {
    tryHandoffForward.mockReturnValue(true);
    const unregister = registerPlaybackOrchestrator({
      bridge: {
        getActiveTrackId: () => "t1",
        loadTrack,
        seek: vi.fn(),
        preloadForward: vi.fn(),
        preloadBackward: vi.fn(),
        tryHandoffForward,
        isFromCache: () => true,
        onWillLoadTrack: vi.fn(),
      },
      onFailed: vi.fn(),
    });

    onPlaybackProgressOrchestration("t1", 98_000, 100_000);
    expect(tryHandoffForward).toHaveBeenCalled();
    expect(advanceAfterHandoff).toHaveBeenCalledWith("forward");
    expect(next).not.toHaveBeenCalled();

    unregister();
  });

  it("triggers queue advance from progress near duration without waiting for Howler ended", () => {
    const unregister = registerPlaybackOrchestrator({
      bridge: {
        getActiveTrackId: () => "t1",
        loadTrack,
        seek: vi.fn(),
        preloadForward: vi.fn(),
        preloadBackward: vi.fn(),
        tryHandoffForward,
        isFromCache: () => true,
        onWillLoadTrack: vi.fn(),
      },
      onFailed: vi.fn(),
    });

    onPlaybackProgressOrchestration("t1", 99_900, 100_000);
    expect(next).toHaveBeenCalledTimes(1);

    unregister();
  });
});
