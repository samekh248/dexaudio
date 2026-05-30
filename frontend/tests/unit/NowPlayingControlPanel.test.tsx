import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NowPlayingControlPanel } from "@/components/layout/NowPlayingControlPanel";

const track = {
  id: "t1",
  title: "Track One",
  artist: "Artist A",
  album: "Album",
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
  });

  it("shows marquee artist - track text", () => {
    renderPanel();
    expect(screen.getByTestId("marquee-display")).toHaveTextContent("Artist A - Track One");
  });

  it("hides visible text labels until control is hovered", () => {
    renderPanel();
    const region = screen.getByRole("region", { name: "Playback controls" });
    const playButton = within(region).getByRole("button", { name: "Play" });
    const playLabel = within(playButton).getByText("Play");
    expect(playLabel).toHaveClass("opacity-0");
  });
});
