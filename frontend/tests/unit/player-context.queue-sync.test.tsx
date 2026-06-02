import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { PlayerProvider } from "@/contexts/player-context";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

const mockPlayer = {
  playing: false,
  position: 0,
  duration: 0,
  volume: 1,
  fromCache: true,
  loading: false,
  status: "playing" as const,
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

vi.mock("@/lib/playback-prefs-store", () => ({
  getTransitionStyle: () => "none",
}));

const track = (id: string) => ({
  id,
  title: `Track ${id}`,
  artist: "Artist",
  album: "Album",
  durationMs: 180_000,
  format: "mp3" as const,
});

describe("PlayerProvider queue sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayer.getActiveTrackId.mockReturnValue("t1");
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

  it("loads the next track when the queue advances without waiting for React effects", () => {
    render(
      <PlayerProvider>
        <div />
      </PlayerProvider>,
    );

    usePlaybackQueue.getState().next();

    expect(mockPlayer.loadTrack).toHaveBeenCalledWith(track("t2"));
  });
});
