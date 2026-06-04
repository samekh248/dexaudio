import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TrackWaveform } from "@/components/player/TrackWaveform";

const mockWaveform = {
  trackId: "99",
  samples: [0.1, 0.5, 0.9, 0.3],
  sampleIntervalMs: 100,
  durationMs: 120000,
};

vi.mock("@/hooks/use-track-waveform", () => ({
  useTrackWaveform: vi.fn(),
}));

import { useTrackWaveform } from "@/hooks/use-track-waveform";

const useTrackWaveformMock = vi.mocked(useTrackWaveform);

describe("TrackWaveform", () => {
  beforeEach(() => {
    useTrackWaveformMock.mockReturnValue({ status: "ready", waveform: mockWaveform });
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => ({
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders nothing while loading", () => {
    useTrackWaveformMock.mockReturnValue({ status: "loading", waveform: null });
    const { container } = render(
      <TrackWaveform trackId="99" positionMs={0} durationMs={120000} onSeek={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onSeek on click at midpoint", () => {
    const onSeek = vi.fn();
    const { container } = render(
      <TrackWaveform
        trackId="99"
        positionMs={0}
        durationMs={120000}
        onSeek={onSeek}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeTruthy();
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 200,
      top: 0,
      height: 64,
      right: 200,
      bottom: 64,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.click(canvas!, { clientX: 100 });
    expect(onSeek).toHaveBeenCalledWith(60000);
  });

  it("does not seek on pointer drag release", () => {
    const onSeek = vi.fn();
    const { container } = render(
      <TrackWaveform
        trackId="99"
        positionMs={0}
        durationMs={120000}
        onSeek={onSeek}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 200,
      top: 0,
      height: 64,
      right: 200,
      bottom: 64,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.pointerDown(canvas);
    fireEvent.pointerMove(canvas, { clientX: 150, buttons: 1 });
    fireEvent.click(canvas, { clientX: 150 });
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("blocks seek and hover preview when seekDisabled", () => {
    const onSeek = vi.fn();
    const { container } = render(
      <TrackWaveform
        trackId="99"
        positionMs={0}
        durationMs={120000}
        seekDisabled
        onSeek={onSeek}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    const canvas = container.querySelector("canvas")!;
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 200,
      top: 0,
      height: 64,
      right: 200,
      bottom: 64,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.pointerMove(canvas, { clientX: 50 });
    expect(screen.queryByText("0:30")).not.toBeInTheDocument();
    fireEvent.click(canvas, { clientX: 50 });
    expect(onSeek).not.toHaveBeenCalled();
  });
});
