import {
  useCallback,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

const CLOSE_GRACE_MS = 120;
const LONG_PRESS_MS = 400;

export interface UseHoverIntentOptions {
  /** When false, panel never opens (e.g. no active track). */
  enabled?: boolean;
}

export function useHoverIntent({ enabled = true }: UseHoverIntentOptions = {}) {
  const [open, setOpen] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActiveRef = useRef(false);
  const suppressNavRef = useRef(false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPanel = useCallback(() => {
    if (!enabled) return;
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer, enabled]);

  const scheduleClose = useCallback(() => {
    if (!enabled) return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_GRACE_MS);
  }, [clearCloseTimer, enabled]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const isInsideRegion = useCallback((node: Node | null) => {
    const region = regionRef.current;
    return Boolean(node && region?.contains(node));
  }, []);

  const regionProps = {
    ref: regionRef,
    onPointerEnter: (e: PointerEvent<HTMLDivElement>) => {
      if (!enabled || e.pointerType === "touch") return;
      openPanel();
    },
    onPointerLeave: (e: PointerEvent<HTMLDivElement>) => {
      if (!enabled || e.pointerType === "touch") return;
      const related = e.relatedTarget as Node | null;
      if (isInsideRegion(related)) return;
      scheduleClose();
    },
    onFocusCapture: () => {
      openPanel();
    },
    onBlurCapture: (e: FocusEvent<HTMLDivElement>) => {
      const related = e.relatedTarget as Node | null;
      if (isInsideRegion(related)) return;
      clearCloseTimer();
      setOpen(false);
    },
  };

  const linkTouchProps = {
    onPointerDown: (e: PointerEvent<HTMLAnchorElement>) => {
      if (!enabled || e.pointerType !== "touch") return;
      longPressActiveRef.current = false;
      suppressNavRef.current = false;
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        longPressActiveRef.current = true;
        suppressNavRef.current = true;
        openPanel();
      }, LONG_PRESS_MS);
    },
    onPointerUp: (e: PointerEvent<HTMLAnchorElement>) => {
      if (e.pointerType !== "touch") return;
      clearLongPressTimer();
      if (!longPressActiveRef.current) {
        suppressNavRef.current = false;
        return;
      }
      const related = e.relatedTarget as Node | null;
      if (!isInsideRegion(related) && !isInsideRegion(e.currentTarget)) {
        scheduleClose();
      }
    },
    onPointerCancel: () => {
      clearLongPressTimer();
      longPressActiveRef.current = false;
      suppressNavRef.current = false;
    },
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      if (suppressNavRef.current) {
        e.preventDefault();
        suppressNavRef.current = false;
      }
    },
  };

  return {
    open: enabled && open,
    regionProps,
    linkTouchProps,
  };
}
