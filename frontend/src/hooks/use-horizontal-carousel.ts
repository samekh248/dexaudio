import { useCallback, useEffect, useRef, useState } from "react";

export const SCROLL_EPSILON = 2;
export const MIN_SCROLL_STEP = 1;
const VISIBILITY_TOLERANCE_PX = 1;

function isFullyVisible(
  entryRect: DOMRect,
  containerRect: DOMRect,
  tolerance = VISIBILITY_TOLERANCE_PX,
): boolean {
  return (
    entryRect.left >= containerRect.left - tolerance &&
    entryRect.right <= containerRect.right + tolerance
  );
}

export function countFullyVisibleEntries(container: HTMLElement): number {
  const containerRect = container.getBoundingClientRect();
  let count = 0;
  for (const child of container.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (isFullyVisible(child.getBoundingClientRect(), containerRect)) {
      count += 1;
    }
  }
  return count;
}

export function getFirstFullyVisibleIndex(container: HTMLElement): number {
  const containerRect = container.getBoundingClientRect();
  const children = Array.from(container.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
  return children.findIndex((child) =>
    isFullyVisible(child.getBoundingClientRect(), containerRect),
  );
}

export function getVisibleScrollStep(container: HTMLElement): number {
  const count = countFullyVisibleEntries(container);
  return Math.max(count, MIN_SCROLL_STEP);
}

function updateScrollFlags(container: HTMLElement) {
  const { scrollLeft, clientWidth, scrollWidth } = container;
  const needsScrollControls = scrollWidth > clientWidth + SCROLL_EPSILON;
  const canScrollLeft = scrollLeft > SCROLL_EPSILON;
  const canScrollRight = scrollLeft + clientWidth < scrollWidth - SCROLL_EPSILON;
  return { needsScrollControls, canScrollLeft, canScrollRight };
}

export function useHorizontalCarousel(entryCount = 0) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [needsScrollControls, setNeedsScrollControls] = useState(false);

  const recompute = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const flags = updateScrollFlags(container);
    setNeedsScrollControls(flags.needsScrollControls);
    setCanScrollLeft(flags.canScrollLeft);
    setCanScrollRight(flags.canScrollRight);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    recompute();

    const onScroll = () => recompute();
    container.addEventListener("scroll", onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => recompute());
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    };
  }, [recompute]);

  useEffect(() => {
    recompute();
  }, [entryCount, recompute]);

  const scrollForward = useCallback(() => {
    const container = scrollRef.current;
    if (!container || container.children.length === 0) return;

    const children = Array.from(container.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    const step = getVisibleScrollStep(container);
    const firstVisible = getFirstFullyVisibleIndex(container);
    const startIndex = firstVisible < 0 ? 0 : firstVisible;
    const targetIndex = startIndex + step;
    const lastIndex = children.length - 1;

    if (targetIndex >= lastIndex) {
      container.scrollTo({
        left: container.scrollWidth - container.clientWidth,
        behavior: "smooth",
      });
      return;
    }

    children[targetIndex].scrollIntoView({
      inline: "start",
      block: "nearest",
      behavior: "smooth",
    });
  }, []);

  const scrollBackward = useCallback(() => {
    const container = scrollRef.current;
    if (!container || container.children.length === 0) return;

    const children = Array.from(container.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    const step = getVisibleScrollStep(container);
    const firstVisible = getFirstFullyVisibleIndex(container);
    const startIndex = firstVisible < 0 ? 0 : firstVisible;
    const targetIndex = Math.max(0, startIndex - step);

    children[targetIndex].scrollIntoView({
      inline: "start",
      block: "nearest",
      behavior: "smooth",
    });
  }, []);

  return {
    scrollRef,
    scrollForward,
    scrollBackward,
    canScrollLeft,
    canScrollRight,
    needsScrollControls,
  };
}
