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

const track = {
  id: "t1",
  title: "Song",
  artist: "Artist",
  album: "Album",
  durationMs: 180000,
  format: "mp3" as const,
};

describe("usePlaybackControls", () => {
  const nextSpy = vi.fn();
  const previousSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayer.playing = false;
    mockPlayer.autoplayBlocked = false;
    mockPlayer.position = 0;
    usePlaybackQueue.setState({
      items: [{ track, source: "user" as const }],
      currentIndex: 0,
      playbackStarted: true,
      next: nextSpy,
      previous: previousSpy,
    });
  });

  it("returns current track from queue", () => {
    const { result } = renderHook(() => usePlaybackControls());
    expect(result.current.current).toEqual(track);
  });

  it("returns null current when queue empty", () => {
    usePlaybackQueue.setState({ items: [], currentIndex: -1, playbackStarted: false });
    const { result } = renderHook(() => usePlaybackControls());
    expect(result.current.current).toBeNull();
  });

  it("mirrors player.playing", () => {
    mockPlayer.playing = true;
    const { result } = renderHook(() => usePlaybackControls());
    expect(result.current.playing).toBe(true);
  });

  it("toggle pauses when playing", () => {
    mockPlayer.playing = true;
    const { result } = renderHook(() => usePlaybackControls());
    act(() => result.current.toggle());
    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  it("toggle plays when paused", () => {
    const { result } = renderHook(() => usePlaybackControls());
    act(() => result.current.toggle());
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it("toggle resumes autoplay when blocked", () => {
    mockPlayer.autoplayBlocked = true;
    const { result } = renderHook(() => usePlaybackControls());
    act(() => result.current.toggle());
    expect(mockPlayer.resumeAutoplay).toHaveBeenCalled();
  });

  it("next advances queue when transition is none", () => {
    const { result } = renderHook(() => usePlaybackControls());
    act(() => result.current.next());
    expect(mockPlayer.fadeOut).not.toHaveBeenCalled();
    expect(nextSpy).toHaveBeenCalled();
  });

  it("previous restarts track at queue start when playing", () => {
    mockPlayer.playing = true;
    const { result } = renderHook(() => usePlaybackControls());
    act(() => result.current.previous());
    expect(mockPlayer.seek).toHaveBeenCalledWith(0);
    expect(previousSpy).not.toHaveBeenCalled();
  });

  it("previous calls queue previous when not at start", () => {
    usePlaybackQueue.setState({
      items: [
        { track: { ...track, id: "t0" }, source: "user" as const },
        { track, source: "user" as const },
      ],
      currentIndex: 1,
      playbackStarted: true,
      next: nextSpy,
      previous: previousSpy,
    });
    const { result } = renderHook(() => usePlaybackControls());
    act(() => result.current.previous());
    expect(previousSpy).toHaveBeenCalled();
  });
});
