import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { AlbumCoverImage } from "@/components/albums/AlbumCoverImage";
import { REVEALED_URL_CACHE } from "@/hooks/use-album-cover-load";

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function getCoverImg(container: HTMLElement): HTMLImageElement {
  const img = container.querySelector("img");
  if (!img) throw new Error("cover img not found");
  return img;
}

describe("AlbumCoverImage", () => {
  beforeEach(() => {
    REVEALED_URL_CACHE.clear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("render phases", () => {
    it("shows empty slot while pending with no visible partial image", () => {
      const { container } = render(<AlbumCoverImage artUrl="https://example.com/cover.jpg" />);
      const img = getCoverImg(container);
      expect(img).toHaveClass("opacity-0");
      expect(screen.queryByText("No art")).not.toBeInTheDocument();
    });

    it("shows fallback for absent URL", () => {
      render(<AlbumCoverImage artUrl={undefined} />);
      expect(screen.getByText("No art")).toBeInTheDocument();
      expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
    });

    it("does not apply reveal class for absent URL", () => {
      const onPhaseChange = vi.fn();
      render(<AlbumCoverImage artUrl={undefined} onPhaseChange={onPhaseChange} />);
      expect(onPhaseChange).toHaveBeenCalledWith("absent");
    });
  });

  describe("failed and timeout", () => {
    it("shows fallback on error without reveal class", () => {
      const { container } = render(<AlbumCoverImage artUrl="https://example.com/bad.jpg" />);
      const img = getCoverImg(container);

      act(() => {
        fireEvent.error(img);
      });

      expect(screen.getByText("No art")).toBeInTheDocument();
      expect(container.querySelector("img")).toBeNull();
    });

    it("calls onPhaseChange with failed for error", () => {
      const onPhaseChange = vi.fn();
      const { container } = render(
        <AlbumCoverImage artUrl="https://example.com/bad.jpg" onPhaseChange={onPhaseChange} />,
      );
      const img = getCoverImg(container);

      act(() => {
        fireEvent.error(img);
      });

      expect(onPhaseChange).toHaveBeenLastCalledWith("failed");
    });
  });

  describe("reduced motion", () => {
    it("applies fade-only class not bounce class when reduced motion", () => {
      mockMatchMedia(true);
      const { container } = render(<AlbumCoverImage artUrl="https://example.com/cover.jpg" />);
      const img = getCoverImg(container);

      act(() => {
        fireEvent.load(img);
      });

      expect(img.className).toContain("album-cover-reveal--fade-only");
      expect(img.className).not.toContain(" album-cover-reveal ");
      expect(img.className).not.toMatch(/\balbum-cover-reveal$/);
    });
  });
});
