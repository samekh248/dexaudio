import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  forwardTrackIdsForState,
  preloadForwardDepth,
  registerPlaybackOrchestrator,
} from "@/lib/playback-orchestrator";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

vi.mock("@/lib/playback-prefs-store", () => ({
  getTransitionStyle: () => "none",
  getQueuePrepDepth: () => 3,
}));

const track = (id: string, format: "mp3" | "flac" = "mp3") => ({
  id,
  title: id,
  artist: "A",
  album: "B",
  durationMs: 100_000,
  format,
});

describe("playback orchestrator prep depth", () => {
  const preloadForward = vi.fn();
  const cancelStagedOutside = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    usePlaybackQueue.setState({
      items: [track("1"), track("2"), track("3"), track("4")].map((t) => ({
        track: t,
        source: "user" as const,
      })),
      currentIndex: 0,
      playbackStarted: true,
      restorePhase: false,
      hydrated: true,
      skippedIndices: new Set(),
      failedIndices: new Set(),
      loadGeneration: 0,
    });
  });

  it("forwardTrackIdsForState returns up to depth successors", () => {
    const ids = forwardTrackIdsForState(usePlaybackQueue.getState());
    expect(ids).toEqual(["2", "3", "4"]);
  });

  it("preloadForwardDepth preloads depth tracks and trims staged pool", () => {
    const unregister = registerPlaybackOrchestrator({
      bridge: {
        getActiveTrackId: () => "1",
        loadTrack: vi.fn(),
        seek: vi.fn(),
        preloadForward,
        preloadBackward: vi.fn(),
        tryHandoffForward: () => false,
        isFromCache: () => false,
        isUserPlaybackActive: () => true,
        onWillLoadTrack: vi.fn(),
        cancelStagedOutside,
      },
      onFailed: vi.fn(),
    });

    preloadForward.mockClear();
    cancelStagedOutside.mockClear();
    preloadForwardDepth(usePlaybackQueue.getState());
    expect(preloadForward).toHaveBeenCalledTimes(3);
    expect(cancelStagedOutside).toHaveBeenCalledWith(["2", "3", "4"]);

    unregister();
  });
});
