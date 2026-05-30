import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { PlayerProvider } from "@/contexts/player-context";
import { usePlaybackQueue } from "@/stores/playback-queue-store";
import {
  bumpPreCacheGeneration,
  runPreCacheForPlayback,
} from "@/lib/pre-cache-worker";

const mockPlayer = {
  playing: false,
  position: 0,
  duration: 0,
  volume: 1,
  fromCache: false,
  loading: false,
  status: "idle",
  error: null,
  autoplayBlocked: false,
  loadTrack: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  fadeOut: vi.fn((cb: () => void) => cb()),
  unload: vi.fn(),
  clearError: vi.fn(),
  resumeAutoplay: vi.fn(),
  preloadForward: vi.fn(),
  preloadBackward: vi.fn(),
  tryHandoffForward: vi.fn(() => false),
  tryHandoffBackward: vi.fn(() => false),
  getActiveTrackId: vi.fn(() => "t1"),
  cancelStagedPreloads: vi.fn(),
  setTerminalHandler: vi.fn(),
  isTerminalStatus: vi.fn(() => false),
};

vi.mock("@/hooks/use-player", () => ({
  usePlayerState: () => mockPlayer,
}));

vi.mock("@/lib/pre-cache-worker", () => ({
  bumpPreCacheGeneration: vi.fn(() => 1),
  runPreCacheForPlayback: vi.fn(),
}));

const track = (id: string) => ({
  id,
  title: `Track ${id}`,
  artist: "Artist",
  album: "Album",
  durationMs: 180_000,
  format: "mp3" as const,
});

describe("PlayerProvider pre-cache gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayer.fromCache = false;
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

  it("cancels stale pre-cache work but does not open look-ahead streams for live playback", () => {
    render(
      <PlayerProvider>
        <div />
      </PlayerProvider>,
    );

    expect(bumpPreCacheGeneration).toHaveBeenCalledTimes(1);
    expect(runPreCacheForPlayback).not.toHaveBeenCalled();
  });

  it("runs pre-cache when the active track is already cached", () => {
    mockPlayer.fromCache = true;

    render(
      <PlayerProvider>
        <div />
      </PlayerProvider>,
    );

    expect(bumpPreCacheGeneration).toHaveBeenCalledTimes(1);
    expect(runPreCacheForPlayback).toHaveBeenCalledTimes(1);
  });
});
