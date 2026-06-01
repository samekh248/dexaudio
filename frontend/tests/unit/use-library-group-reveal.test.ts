import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { LibraryGroupKey } from "@dexaudio/shared-types";
import {
  REVEALED_GROUP_KEYS,
  clearRevealedGroupKeys,
  groupRevealSessionKey,
  useLibraryGroupReveal,
  GROUP_ENTRY_SLIDE_MS,
  GROUP_ENTRY_STAGGER_MS,
  GROUP_REDUCE_MOTION_FADE_MS,
} from "@/hooks/use-library-group-reveal";

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

describe("useLibraryGroupReveal", () => {
  beforeEach(() => {
    clearRevealedGroupKeys();
    mockMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("stays preparing until all entries report ready", () => {
    const { result } = renderHook(() =>
      useLibraryGroupReveal("lib-1", "recently-played" as LibraryGroupKey, 2),
    );

    expect(result.current.phase).toBe("preparing");

    act(() => {
      result.current.registerEntry(0, true);
    });
    expect(result.current.phase).toBe("preparing");

    act(() => {
      result.current.registerEntry(1, true);
    });
    expect(result.current.phase).toBe("animating");
  });

  it("transitions animating to revealed after stagger duration", () => {
    const { result } = renderHook(() =>
      useLibraryGroupReveal("lib-1", "hidden-gems" as LibraryGroupKey, 2),
    );

    act(() => {
      result.current.registerEntry(0, true);
      result.current.registerEntry(1, true);
    });

    expect(result.current.phase).toBe("animating");

    act(() => {
      vi.advanceTimersByTime(GROUP_ENTRY_STAGGER_MS + GROUP_ENTRY_SLIDE_MS);
    });

    expect(result.current.phase).toBe("revealed");
    expect(REVEALED_GROUP_KEYS.has(groupRevealSessionKey("lib-1", "hidden-gems"))).toBe(true);
  });

  it("skips to revealed when session key already exists", () => {
    REVEALED_GROUP_KEYS.add(groupRevealSessionKey("lib-1", "recently-added"));

    const { result } = renderHook(() =>
      useLibraryGroupReveal("lib-1", "recently-added" as LibraryGroupKey, 3),
    );

    expect(result.current.phase).toBe("revealed");
    expect(result.current.isInteractive).toBe(true);
  });

  it("uses shorter duration when reduced motion is enabled", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() =>
      useLibraryGroupReveal("lib-1", "random-picks" as LibraryGroupKey, 2),
    );

    act(() => {
      result.current.registerEntry(0, true);
      result.current.registerEntry(1, true);
    });

    expect(result.current.prefersReducedMotion).toBe(true);
    expect(result.current.phase).toBe("animating");

    act(() => {
      vi.advanceTimersByTime(GROUP_REDUCE_MOTION_FADE_MS);
    });

    expect(result.current.phase).toBe("revealed");
  });

  it("clearRevealedGroupKeys resets session cache", () => {
    REVEALED_GROUP_KEYS.add(groupRevealSessionKey("lib-1", "recently-played"));
    clearRevealedGroupKeys();
    expect(REVEALED_GROUP_KEYS.size).toBe(0);
  });
});
