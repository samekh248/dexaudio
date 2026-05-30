import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VolumeControl } from "@/components/player/VolumeControl";

describe("VolumeControl", () => {
  afterEach(() => cleanup());

  it("shows Volume muted label and VolumeX icon at zero volume", () => {
    render(<VolumeControl volume={0} onVolume={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Volume muted" })).toBeInTheDocument();
  });

  it("shows Volume label and opens slider popover on click", () => {
    render(<VolumeControl volume={0.5} onVolume={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Volume" }));
    expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-valuenow", "50");
  });

  it("reflects current volume on the slider thumb", () => {
    render(<VolumeControl volume={0.25} onVolume={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Volume" }));
    expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-valuenow", "25");
  });

  it("closes popover when forceClosed becomes true", () => {
    const { rerender } = render(
      <VolumeControl volume={0.5} onVolume={vi.fn()} forceClosed={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Volume" }));
    expect(screen.getByRole("slider", { name: "Volume" })).toBeInTheDocument();
    rerender(<VolumeControl volume={0.5} onVolume={vi.fn()} forceClosed />);
    expect(screen.queryByRole("slider", { name: "Volume" })).not.toBeInTheDocument();
  });
});
