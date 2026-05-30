import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

const mockPlayer = {
  playing: false,
  autoplayBlocked: false,
  position: 0,
  play: vi.fn(),
  pause: vi.fn(),
  resumeAutoplay: vi.fn(),
  seek: vi.fn(),
  fadeOut: vi.fn((cb: () => void) => cb()),
  tryHandoffForward: vi.fn(() => false),
  tryHandoffBackward: vi.fn(() => false),
};

vi.mock("@/contexts/player-context", () => ({
  usePlayer: () => mockPlayer,
}));

vi.mock("@/lib/playback-prefs-store", () => ({
  getTransitionStyle: () => "none",
}));

const track = (id: string) => ({
  id,
  title: "Song",
  artist: "Artist",
  album: "Album",
  durationMs: 180000,
  format: "mp3" as const,
});

describe("player orchestration controls", () => {
  const nextSpy = vi.fn();
  const previousSpy = vi.fn();
  const advanceAfterHandoffSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayer.playing = false;
    mockPlayer.position = 0;
    usePlaybackQueue.setState({
      items: [track("t1"), track("t2")].map((t) => ({ track: t, source: "user" as const })),
      currentIndex: 0,
      playbackStarted: true,
      next: nextSpy,
      previous: previousSpy,
      advanceAfterHandoff: advanceAfterHandoffSpy,
    });
  });

  it("next advances queue when no handoff", () => {
    const { result } = renderHook(() => usePlaybackControls());
    act(() => result.current.next());
    expect(nextSpy).toHaveBeenCalledTimes(1);
  });

  it("previous restarts track when position > 3s", () => {
    mockPlayer.position = 5000;
    const { result } = renderHook(() => usePlaybackControls());
    act(() => result.current.previous());
    expect(mockPlayer.seek).toHaveBeenCalledWith(0);
    expect(previousSpy).not.toHaveBeenCalled();
  });

  it("previous goes to previous track when position <= 3s", () => {
    usePlaybackQueue.setState({ currentIndex: 1 });
    mockPlayer.position = 1000;
    const { result } = renderHook(() => usePlaybackControls());
    act(() => result.current.previous());
    expect(previousSpy).toHaveBeenCalled();
  });
});
