import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NowPlayingNav } from "@/components/layout/NowPlayingNav";
import { usePlaybackQueue } from "@/stores/playback-queue-store";

const mockPlayer = {
  playing: false,
  volume: 0.8,
  setVolume: vi.fn(),
};

vi.mock("@/contexts/player-context", () => ({
  usePlayer: () => mockPlayer,
}));

const track = {
  id: "t1",
  title: "Song",
  artist: "Artist",
  album: "Album",
  albumId: "50",
  durationMs: 180000,
  format: "mp3" as const,
};

function renderNav(playing = false) {
  return render(
    <MemoryRouter>
      <NowPlayingNav
        isActive={false}
        playing={playing}
        navLinkClass={(active) => (active ? "active" : "link")}
      />
    </MemoryRouter>,
  );
}

describe("NowPlayingNav", () => {
  beforeEach(() => {
    usePlaybackQueue.setState({
      items: [],
      currentIndex: 0,
      playbackStarted: false,
    });
  });

  afterEach(() => cleanup());

  it("does not show album art in the header link", () => {
    usePlaybackQueue.setState({
      items: [{ track, source: "user" }],
      currentIndex: 0,
      playbackStarted: true,
    });

    renderNav(true);

    expect(screen.queryByTestId("header-track-art")).not.toBeInTheDocument();
    expect(screen.queryByTestId("panel-track-art")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Now Playing/i })).toBeInTheDocument();
  });
});
