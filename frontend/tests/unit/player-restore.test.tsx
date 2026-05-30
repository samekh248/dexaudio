import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

vi.mock("@/hooks/use-player", () => ({
  usePlayerState: () => ({
    playing: false,
    position: 0,
    duration: 0,
    volume: 1,
    fromCache: false,
    loading: false,
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
    getActiveTrackId: vi.fn(() => null),
    cancelStagedPreloads: vi.fn(),
    setTerminalHandler: vi.fn(),
    status: "idle",
  }),
}));

vi.mock("@/lib/pre-cache-worker", () => ({
  bumpPreCacheGeneration: () => 1,
  runPreCacheForPlayback: vi.fn(),
}));

describe("player restore gate", () => {
  beforeEach(() => {
    usePlaybackQueue.setState({
      items: [{ track: { id: "t1", title: "T", artist: "A", album: "B", durationMs: 1000, format: "mp3" }, source: "user" }],
      currentIndex: 0,
      playbackStarted: true,
      restorePhase: true,
      restoredElapsedMs: 5000,
      hydrated: true,
      skippedIndices: new Set(),
      failedIndices: new Set(),
      loadGeneration: 0,
    });
  });

  it("does not call loadTrack while restorePhase is active", async () => {
    const { usePlayerState } = await import("@/hooks/use-player");
    const loadTrack = vi.mocked(usePlayerState).mock?.results;

    const { PlayerProvider } = await import("@/contexts/player-context");
    const { usePlayer } = await import("@/contexts/player-context");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PlayerProvider>{children}</PlayerProvider>
    );

    const { result } = renderHook(() => usePlayer(), { wrapper });
    const state = usePlaybackQueue.getState();
    expect(state.restorePhase).toBe(true);
    expect(result.current.restorePhase).toBe(true);

    const loadTrackMock = result.current.loadTrack as ReturnType<typeof vi.fn>;
    expect(loadTrackMock).not.toHaveBeenCalled();

    await act(async () => {
      result.current.play();
    });

    expect(usePlaybackQueue.getState().restorePhase).toBe(false);
  });
});
