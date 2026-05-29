import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useAlbumCoverLoad,
  REVEALED_URL_CACHE,
  COVER_LOAD_TIMEOUT_MS,
} from "@/hooks/use-album-cover-load";

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

describe("useAlbumCoverLoad", () => {
  beforeEach(() => {
    REVEALED_URL_CACHE.clear();
    mockMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("phase transitions", () => {
    it("starts pending when artUrl is present", () => {
      const { result } = renderHook(() => useAlbumCoverLoad("https://example.com/cover.jpg"));
      expect(result.current.phase).toBe("pending");
      expect(result.current.showEmptySlot).toBe(true);
      expect(result.current.revealComplete).toBe(false);
    });

    it("transitions pending → revealing → revealed on load", () => {
      const { result } = renderHook(() => useAlbumCoverLoad("https://example.com/cover.jpg"));

      act(() => {
        result.current.imageProps.onLoad({} as React.SyntheticEvent<HTMLImageElement>);
      });
      expect(result.current.phase).toBe("revealing");

      act(() => {
        result.current.imageProps.onAnimationEnd({} as React.AnimationEvent<HTMLImageElement>);
      });
      expect(result.current.phase).toBe("revealed");
      expect(result.current.revealComplete).toBe(true);
      expect(REVEALED_URL_CACHE.has("https://example.com/cover.jpg")).toBe(true);
    });

    it("returns absent when no artUrl", () => {
      const { result } = renderHook(() => useAlbumCoverLoad(undefined));
      expect(result.current.phase).toBe("absent");
      expect(result.current.showFallback).toBe(true);
      expect(result.current.revealComplete).toBe(true);
    });

    it("skips animation for cached URL on mount", () => {
      REVEALED_URL_CACHE.add("https://example.com/cached.jpg");
      const { result } = renderHook(() => useAlbumCoverLoad("https://example.com/cached.jpg"));
      expect(result.current.phase).toBe("revealed");
      expect(result.current.revealComplete).toBe(true);
    });

    it("on remount with cached URL skips animation", () => {
      const url = "https://example.com/remount.jpg";
      const { result, unmount } = renderHook(() => useAlbumCoverLoad(url));

      act(() => {
        result.current.imageProps.onLoad({} as React.SyntheticEvent<HTMLImageElement>);
      });
      act(() => {
        result.current.imageProps.onAnimationEnd({} as React.AnimationEvent<HTMLImageElement>);
      });
      expect(REVEALED_URL_CACHE.has(url)).toBe(true);
      unmount();

      const { result: remount } = renderHook(() => useAlbumCoverLoad(url));
      expect(remount.current.phase).toBe("revealed");
    });
  });

  describe("error and timeout", () => {
    it("transitions to failed on error", () => {
      const { result } = renderHook(() => useAlbumCoverLoad("https://example.com/bad.jpg"));

      act(() => {
        result.current.imageProps.onError({} as React.SyntheticEvent<HTMLImageElement>);
      });
      expect(result.current.phase).toBe("failed");
      expect(result.current.showFallback).toBe(true);
      expect(result.current.revealComplete).toBe(true);
      expect(REVEALED_URL_CACHE.has("https://example.com/bad.jpg")).toBe(false);
    });

    it("transitions to failed after 10s timeout", () => {
      const { result } = renderHook(() => useAlbumCoverLoad("https://example.com/slow.jpg"));
      expect(result.current.phase).toBe("pending");

      act(() => {
        vi.advanceTimersByTime(COVER_LOAD_TIMEOUT_MS);
      });
      expect(result.current.phase).toBe("failed");
      expect(REVEALED_URL_CACHE.has("https://example.com/slow.jpg")).toBe(false);
    });

    it("does not add URL to cache on failed reveal", () => {
      const url = "https://example.com/fail.jpg";
      const { result } = renderHook(() => useAlbumCoverLoad(url));

      act(() => {
        result.current.imageProps.onError({} as React.SyntheticEvent<HTMLImageElement>);
      });
      expect(REVEALED_URL_CACHE.has(url)).toBe(false);
    });
  });

  describe("reduced motion", () => {
    it("selects fade-only class when prefers-reduced-motion is reduce", () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useAlbumCoverLoad("https://example.com/cover.jpg"));

      act(() => {
        result.current.imageProps.onLoad({} as React.SyntheticEvent<HTMLImageElement>);
      });
      expect(result.current.imageProps.className).toContain("album-cover-reveal--fade-only");
      expect(result.current.imageProps.className).not.toContain("album-cover-reveal ");
    });
  });
});
