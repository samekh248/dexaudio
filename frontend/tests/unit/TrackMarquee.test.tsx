import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TrackMarquee } from "@/components/player/TrackMarquee";

describe("TrackMarquee", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
  });

  it("renders static text when content fits", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(80);
    render(<TrackMarquee text="Short" />);
    expect(screen.getByTestId("marquee-display")).toHaveTextContent("Short");
    expect(screen.queryByText("Short", { selector: "span[aria-hidden='true']" })).toBeInTheDocument();
  });

  it("duplicates text for loop scroll when overflowing", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);
    render(
      <TrackMarquee text="Very Long Artist Name - Very Long Track Title That Overflows" />,
    );
    expect(screen.getByTestId("marquee-display")).toHaveTextContent(
      "Very Long Artist Name - Very Long Track Title That Overflows",
    );
    expect(document.querySelector(".motion-safe\\:animate-marquee")).toBeTruthy();
  });

  it("updates when text prop changes", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(80);
    const { rerender } = render(<TrackMarquee text="First" />);
    expect(screen.getByTestId("marquee-display")).toHaveTextContent("First");
    rerender(<TrackMarquee text="Second" />);
    expect(screen.getByTestId("marquee-display")).toHaveTextContent("Second");
  });

  it("uses truncate without animation class when reduced motion and overflowing", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(300);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    render(<TrackMarquee text="Very Long Artist Name - Very Long Track Title That Overflows" />);
    const row = screen.getByTestId("marquee-display").closest(".motion-reduce\\:truncate");
    expect(row).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
