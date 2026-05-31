import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NowPlayingControlPanel } from "@/components/layout/NowPlayingControlPanel";

const track = {
  id: "t1",
  title: "Track One",
  artist: "Artist A",
  album: "Album",
  albumId: "50",
  durationMs: 200000,
  format: "mp3" as const,
};

function renderPanel(
  props: Partial<Parameters<typeof NowPlayingControlPanel>[0]> = {},
) {
  const defaults = {
    open: true,
    current: track,
    playing: false,
    volume: 0.8,
    onVolume: vi.fn(),
    onToggle: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
  };
  return render(<NowPlayingControlPanel {...defaults} {...props} />);
}

describe("NowPlayingControlPanel", () => {
  afterEach(() => cleanup());

  it("renders nothing when open is false", () => {
    const { container } = renderPanel({ open: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("calls handlers when controls activated", () => {
    const onToggle = vi.fn();
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    renderPanel({ onToggle, onNext, onPrevious });

    const region = screen.getByRole("region", { name: "Playback controls" });
    fireEvent.click(within(region).getByRole("button", { name: "Play" }));
    fireEvent.click(within(region).getByRole("button", { name: "Next" }));
    fireEvent.click(within(region).getByRole("button", { name: "Previous" }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("shows Pause label when playing", () => {
    renderPanel({ playing: true });
    const region = screen.getByRole("region", { name: "Playback controls" });
    expect(within(region).getByRole("button", { name: "Pause" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("exposes stable aria-labels on all controls", () => {
    renderPanel();
    const region = screen.getByRole("region", { name: "Playback controls" });
    expect(within(region).getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: "Volume" })).toBeInTheDocument();
  });

  it("shows volume control when panel is open", () => {
    renderPanel({ volume: 0 });
    const region = screen.getByRole("region", { name: "Playback controls" });
    expect(within(region).getByRole("button", { name: "Volume muted" })).toBeInTheDocument();
  });

  it("shows marquee artist - track text", () => {
    renderPanel();
    expect(screen.getByTestId("marquee-display")).toHaveTextContent("Artist A - Track One");
  });

  it("shows left-aligned album art beside track info", () => {
    renderPanel();
    const region = screen.getByRole("region", { name: "Playback controls" });
    const art = within(region).getByTestId("panel-track-art");
    expect(region.querySelector(".relative.z-10")).toContainElement(art);
    expect(art.querySelector("img")).toHaveAttribute(
      "src",
      "/api/v1/plex/photo?path=%2Flibrary%2Fmetadata%2F50%2Fthumb",
    );
  });

  it("uses blurred album art as the popup background", () => {
    renderPanel();
    const region = screen.getByRole("region", { name: "Playback controls" });
    const background = within(region).getByTestId("panel-art-background");
    expect(background).toHaveClass("blur-md", "opacity-45");
    expect(background).toHaveAttribute(
      "src",
      "/api/v1/plex/photo?path=%2Flibrary%2Fmetadata%2F50%2Fthumb",
    );
  });

  it("reserves bottom padding for control helper labels", () => {
    renderPanel();
    const region = screen.getByRole("region", { name: "Playback controls" });
    expect(region).toHaveClass("pb-8");
  });

  it("hides visible text labels until control is hovered", () => {
    renderPanel();
    const region = screen.getByRole("region", { name: "Playback controls" });
    const playButton = within(region).getByRole("button", { name: "Play" });
    const playLabel = within(playButton).getByText("Play");
    expect(playLabel).toHaveClass("opacity-0");
  });
});
