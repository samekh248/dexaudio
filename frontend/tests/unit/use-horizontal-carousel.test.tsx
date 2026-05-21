import { describe, expect, it, vi, afterEach } from "vitest";
import { render, act, fireEvent, screen, cleanup } from "@testing-library/react";
import {
  countFullyVisibleEntries,
  getFirstFullyVisibleIndex,
  getVisibleScrollStep,
  SCROLL_EPSILON,
  useHorizontalCarousel,
} from "@/hooks/use-horizontal-carousel";

function mockRect(left: number, right: number, top = 0, bottom = 100): DOMRect {
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function setupCarouselDom(childWidths: number[], containerWidth: number) {
  const container = document.createElement("div");
  let scrollLeft = 0;
  const scrollWidth = childWidths.reduce((sum, w) => sum + w, 0);

  Object.defineProperty(container, "clientWidth", {
    configurable: true,
    get: () => containerWidth,
  });
  Object.defineProperty(container, "scrollWidth", {
    configurable: true,
    get: () => scrollWidth,
  });
  Object.defineProperty(container, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value;
      container.dispatchEvent(new Event("scroll"));
    },
  });

  container.scrollTo = vi.fn(({ left }: ScrollToOptions) => {
    scrollLeft = left ?? scrollLeft;
    container.dispatchEvent(new Event("scroll"));
  });

  const containerRect = mockRect(0, containerWidth);
  container.getBoundingClientRect = () => containerRect;

  let offset = 0;
  for (const width of childWidths) {
    const child = document.createElement("div");
    const left = offset - scrollLeft;
    const right = left + width;
    child.getBoundingClientRect = () => mockRect(left, right);
    child.scrollIntoView = vi.fn();
    container.appendChild(child);
    offset += width;
  }

  document.body.appendChild(container);
  return { container };
}

function HookProbe() {
  const api = useHorizontalCarousel();
  return (
    <div>
      <div ref={api.scrollRef} data-testid="scroll-region" />
      <span data-testid="needs-controls">{String(api.needsScrollControls)}</span>
      <span data-testid="can-left">{String(api.canScrollLeft)}</span>
      <span data-testid="can-right">{String(api.canScrollRight)}</span>
    </div>
  );
}

function applyScrollMetrics(
  region: HTMLElement,
  metrics: { scrollWidth: number; clientWidth: number; scrollLeft: number },
) {
  Object.defineProperty(region, "scrollWidth", {
    configurable: true,
    get: () => metrics.scrollWidth,
  });
  Object.defineProperty(region, "clientWidth", {
    configurable: true,
    get: () => metrics.clientWidth,
  });
  Object.defineProperty(region, "scrollLeft", {
    configurable: true,
    get: () => metrics.scrollLeft,
    set: (value: number) => {
      metrics.scrollLeft = value;
      region.dispatchEvent(new Event("scroll"));
    },
  });
}

describe("useHorizontalCarousel scroll math", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("counts fully visible entries within container bounds", () => {
    const { container } = setupCarouselDom([100, 100, 100], 250);
    expect(countFullyVisibleEntries(container)).toBe(2);
  });

  it("returns min step of 1 when zero entries are fully visible", () => {
    const { container } = setupCarouselDom([300, 300], 200);
    expect(countFullyVisibleEntries(container)).toBe(0);
    expect(getVisibleScrollStep(container)).toBe(1);
  });

  it("finds first fully visible child index", () => {
    const { container } = setupCarouselDom([80, 80, 80, 80], 200);
    expect(getFirstFullyVisibleIndex(container)).toBe(0);
  });

  it("scrollForward targets start index plus visible count", () => {
    const { container } = setupCarouselDom([100, 100, 100, 100], 220);
    const first = getFirstFullyVisibleIndex(container);
    const step = getVisibleScrollStep(container);
    const children = Array.from(container.children) as HTMLElement[];
    const targetIndex = (first < 0 ? 0 : first) + step;
    children[targetIndex].scrollIntoView({
      inline: "start",
      block: "nearest",
      behavior: "smooth",
    });
    expect(children[targetIndex].scrollIntoView).toHaveBeenCalled();
  });

  it("scrollBackward targets max(0, firstVisible - step)", () => {
    const { container } = setupCarouselDom([100, 100, 100, 100], 220);
    Object.defineProperty(container, "scrollLeft", {
      configurable: true,
      value: 200,
      writable: true,
    });
    const children = Array.from(container.children) as HTMLElement[];
    children.forEach((child, index) => {
      const left = index * 100 - 200;
      child.getBoundingClientRect = () => mockRect(left, left + 100);
    });
    const first = getFirstFullyVisibleIndex(container);
    const step = getVisibleScrollStep(container);
    const targetIndex = Math.max(0, (first < 0 ? 0 : first) - step);
    children[targetIndex].scrollIntoView({
      inline: "start",
      block: "nearest",
      behavior: "smooth",
    });
    expect(children[targetIndex].scrollIntoView).toHaveBeenCalled();
  });
});

describe("useHorizontalCarousel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("exposes at-start and at-end flags from scroll position", async () => {
    render(<HookProbe />);
    const region = screen.getByTestId("scroll-region");
    const metrics = { scrollWidth: 360, clientWidth: 200, scrollLeft: 0 };
    applyScrollMetrics(region, metrics);

    await act(async () => {
      fireEvent.scroll(region);
    });

    expect(screen.getByTestId("needs-controls")).toHaveTextContent("true");
    expect(screen.getByTestId("can-left")).toHaveTextContent("false");
    expect(screen.getByTestId("can-right")).toHaveTextContent("true");

    await act(async () => {
      metrics.scrollLeft = metrics.scrollWidth - metrics.clientWidth;
      region.dispatchEvent(new Event("scroll"));
    });

    expect(screen.getByTestId("can-left")).toHaveTextContent("true");
    expect(screen.getByTestId("can-right")).toHaveTextContent("false");
  });

  it("updates canScrollLeft and canScrollRight after scroll events", async () => {
    render(<HookProbe />);
    const region = screen.getByTestId("scroll-region");
    const metrics = { scrollWidth: 400, clientWidth: 180, scrollLeft: 0 };
    applyScrollMetrics(region, metrics);

    await act(async () => {
      fireEvent.scroll(region);
    });

    expect(screen.getByTestId("can-left")).toHaveTextContent("false");

    await act(async () => {
      metrics.scrollLeft = 50;
      region.dispatchEvent(new Event("scroll"));
    });

    expect(screen.getByTestId("can-left")).toHaveTextContent("true");
    expect(screen.getByTestId("can-right")).toHaveTextContent("true");
  });

  it("uses SCROLL_EPSILON for edge detection", () => {
    expect(SCROLL_EPSILON).toBe(2);
  });
});
