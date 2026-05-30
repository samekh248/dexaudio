import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlayAlbum } from "@/hooks/use-play-album";
import { api } from "@/services/api-client";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

const navigate = vi.fn();
const playNowSpy = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/services/api-client", () => ({
  api: { getAlbumTracks: vi.fn() },
}));

vi.mock("@/lib/local-storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/local-storage")>();
  return {
    ...actual,
    getPlayNavigationMode: () => "navigate" as const,
  };
});

describe("usePlayAlbum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaybackQueue.setState({
      playNow: playNowSpy,
    });
  });

  it("loads tracks, updates queue, then navigates", async () => {
    const tracks = [
      {
        id: "t1",
        title: "Track",
        artist: "A",
        album: "Al",
        durationMs: 1000,
        format: "mp3" as const,
      },
    ];
    vi.mocked(api.getAlbumTracks).mockResolvedValue(tracks);

    const order: string[] = [];
    playNowSpy.mockImplementation(() => {
      order.push("play");
    });
    navigate.mockImplementation(() => {
      order.push("nav");
    });

    const { result } = renderHook(() => usePlayAlbum());
    await act(async () => {
      await result.current("album-1");
    });

    expect(api.getAlbumTracks).toHaveBeenCalledWith("album-1");
    expect(playNowSpy).toHaveBeenCalledWith(tracks);
    expect(navigate).toHaveBeenCalledWith("/now-playing");
    expect(order).toEqual(["play", "nav"]);
  });
});
