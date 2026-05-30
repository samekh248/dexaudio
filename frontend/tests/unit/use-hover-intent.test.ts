import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHoverIntent } from "@/hooks/use-hover-intent";

describe("useHoverIntent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens on pointerenter for non-touch pointers", () => {
    const { result } = renderHook(() => useHoverIntent({ enabled: true }));
    act(() => {
      result.current.regionProps.onPointerEnter?.({
        pointerType: "mouse",
      } as React.PointerEvent<HTMLDivElement>);
    });
    expect(result.current.open).toBe(true);
  });

  it("closes after grace delay on pointerleave outside region", () => {
    const { result } = renderHook(() => useHoverIntent({ enabled: true }));
    act(() => {
      result.current.regionProps.onPointerEnter?.({
        pointerType: "mouse",
      } as React.PointerEvent<HTMLDivElement>);
    });
    act(() => {
      result.current.regionProps.onPointerLeave?.({
        pointerType: "mouse",
        relatedTarget: null,
      } as React.PointerEvent<HTMLDivElement>);
    });
    expect(result.current.open).toBe(true);
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(result.current.open).toBe(false);
  });

  it("opens on focus capture", () => {
    const { result } = renderHook(() => useHoverIntent({ enabled: true }));
    act(() => {
      result.current.regionProps.onFocusCapture?.();
    });
    expect(result.current.open).toBe(true);
  });

  it("does not open when disabled", () => {
    const { result } = renderHook(() => useHoverIntent({ enabled: false }));
    act(() => {
      result.current.regionProps.onPointerEnter?.({
        pointerType: "mouse",
      } as React.PointerEvent<HTMLDivElement>);
    });
    expect(result.current.open).toBe(false);
  });

  it("opens on touch long-press", () => {
    const { result } = renderHook(() => useHoverIntent({ enabled: true }));
    act(() => {
      result.current.linkTouchProps.onPointerDown?.({
        pointerType: "touch",
      } as React.PointerEvent<HTMLAnchorElement>);
    });
    expect(result.current.open).toBe(false);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.open).toBe(true);
  });

  it("suppresses navigation click after long-press", () => {
    const { result } = renderHook(() => useHoverIntent({ enabled: true }));
    const preventDefault = vi.fn();
    act(() => {
      result.current.linkTouchProps.onPointerDown?.({
        pointerType: "touch",
      } as React.PointerEvent<HTMLAnchorElement>);
      vi.advanceTimersByTime(400);
    });
    act(() => {
      result.current.linkTouchProps.onClick?.({
        preventDefault,
      } as React.MouseEvent<HTMLAnchorElement>);
    });
    expect(preventDefault).toHaveBeenCalled();
  });

  it("does not open on short touch tap", () => {
    const { result } = renderHook(() => useHoverIntent({ enabled: true }));
    act(() => {
      result.current.linkTouchProps.onPointerDown?.({
        pointerType: "touch",
      } as React.PointerEvent<HTMLAnchorElement>);
      result.current.linkTouchProps.onPointerUp?.({
        pointerType: "touch",
        relatedTarget: null,
        currentTarget: document.createElement("a"),
      } as React.PointerEvent<HTMLAnchorElement>);
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.open).toBe(false);
  });
});
