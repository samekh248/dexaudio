import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Track } from "@dexaudio/shared-types";
import { usePlayNow } from "@/hooks/use-play-now";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

const navigate = vi.fn();
const playNowSpy = vi.fn();
const getPlayNavigationMode = vi.fn<() => "navigate" | "stay">();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/lib/local-storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/local-storage")>();
  return {
    ...actual,
    getPlayNavigationMode: () => getPlayNavigationMode(),
  };
});

const sampleTrack: Track = {
  id: "t1",
  title: "Track",
  artist: "Artist",
  album: "Album",
  durationMs: 1000,
  format: "mp3",
};

describe("usePlayNow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPlayNavigationMode.mockReturnValue("navigate");
    usePlaybackQueue.setState({
      playNow: playNowSpy,
    });
  });

  it("navigates to Now Playing when mode is navigate", () => {
    getPlayNavigationMode.mockReturnValue("navigate");

    const { result } = renderHook(() => usePlayNow());
    act(() => {
      result.current([sampleTrack]);
    });

    expect(playNowSpy).toHaveBeenCalledWith([sampleTrack]);
    expect(navigate).toHaveBeenCalledWith("/now-playing");
  });

  it("does not navigate when mode is stay", () => {
    getPlayNavigationMode.mockReturnValue("stay");

    const { result } = renderHook(() => usePlayNow());
    act(() => {
      result.current([sampleTrack]);
    });

    expect(playNowSpy).toHaveBeenCalledWith([sampleTrack]);
    expect(navigate).not.toHaveBeenCalled();
  });
});
