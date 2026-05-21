import { describe, expect, it, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AlbumGroupRow } from "@/components/albums/AlbumGroupRow";

const scrollProps = new WeakMap<
  HTMLElement,
  { scrollWidth: number; clientWidth: number; scrollLeft: number }
>();

function applyOverflowToRegion(region: HTMLElement) {
  scrollProps.set(region, { scrollWidth: 1200, clientWidth: 200, scrollLeft: 0 });
  Object.defineProperty(region, "scrollWidth", {
    configurable: true,
    get: () => scrollProps.get(region)?.scrollWidth ?? 0,
  });
  Object.defineProperty(region, "clientWidth", {
    configurable: true,
    get: () => scrollProps.get(region)?.clientWidth ?? 0,
  });
  Object.defineProperty(region, "scrollLeft", {
    configurable: true,
    get: () => scrollProps.get(region)?.scrollLeft ?? 0,
    set: (value: number) => {
      const state = scrollProps.get(region);
      if (state) state.scrollLeft = value;
      region.dispatchEvent(new Event("scroll"));
    },
  });
  region.scrollTo = vi.fn(({ left }: ScrollToOptions) => {
    const state = scrollProps.get(region);
    if (state) state.scrollLeft = left ?? state.scrollLeft;
    region.dispatchEvent(new Event("scroll"));
  });
}

function applyFitsOnScreen(region: HTMLElement) {
  scrollProps.set(region, { scrollWidth: 200, clientWidth: 200, scrollLeft: 0 });
  Object.defineProperty(region, "scrollWidth", {
    configurable: true,
    get: () => scrollProps.get(region)?.scrollWidth ?? 0,
  });
  Object.defineProperty(region, "clientWidth", {
    configurable: true,
    get: () => scrollProps.get(region)?.clientWidth ?? 0,
  });
  Object.defineProperty(region, "scrollLeft", {
    configurable: true,
    get: () => scrollProps.get(region)?.scrollLeft ?? 0,
    set: (value: number) => {
      const state = scrollProps.get(region);
      if (state) state.scrollLeft = value;
    },
  });
}

describe("AlbumGroupRow", () => {
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      if (this.getAttribute("role") === "region") {
        return {
          left: 0,
          right: 200,
          top: 0,
          bottom: 100,
          width: 200,
          height: 100,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      }
      const index = Array.from(this.parentElement?.children ?? []).indexOf(this);
      const width = Number(this.getAttribute("data-width") ?? 160);
      const left = index * width;
      return {
        left,
        right: left + width,
        top: 0,
        bottom: 100,
        width,
        height: 100,
        x: left,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    };

    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing when entries are empty", () => {
    const { container } = render(<AlbumGroupRow title="Empty" entries={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders all entries in carousel", () => {
    const entries = Array.from({ length: 7 }, (_, i) => <span key={i}>Item {i}</span>);
    render(<AlbumGroupRow title="Test" entries={entries} />);
    expect(screen.getAllByText(/Item/)).toHaveLength(7);
  });

  it("uses h2 heading when hideHeading is false", () => {
    render(<AlbumGroupRow title="Recently Played" entries={[<span key="1">A</span>]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Recently Played" })).toBeInTheDocument();
  });

  it("exposes focusable carousel region with scrollbar-hide", () => {
    render(<AlbumGroupRow title="Test" entries={[<span key="1">A</span>]} />);
    const region = screen.getByRole("region", { name: "Test carousel" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toMatch(/scrollbar-hide/);
    expect(region.className).toMatch(/overflow-x-auto/);
  });

  it("shows right scroll button when content overflows and hides left at start", () => {
    const entries = Array.from({ length: 8 }, (_, i) => (
      <span key={i} data-width="160">
        Item {i}
      </span>
    ));
    render(<AlbumGroupRow title="Overflow" entries={entries} />);
    const region = screen.getByRole("region", { name: "Overflow carousel" });
    applyOverflowToRegion(region);
    fireEvent.scroll(region);

    expect(screen.queryByRole("button", { name: "Scroll left" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scroll right" })).toBeInTheDocument();
  });

  it("uses fully visible count for mixed-width children", () => {
    const entries = [
      <span key="a" data-width="160">
        A
      </span>,
      <span key="b" data-width="160">
        B
      </span>,
      <span key="c" data-width="240">
        C
      </span>,
      <span key="d" data-width="160">
        D
      </span>,
      <span key="e" data-width="160">
        E
      </span>,
    ];
    render(<AlbumGroupRow title="Mixed" entries={entries} />);
    const region = screen.getByRole("region", { name: "Mixed carousel" });
    applyOverflowToRegion(region);
    fireEvent.scroll(region);

    fireEvent.click(screen.getByRole("button", { name: "Scroll right" }));
    const children = Array.from(region.children) as HTMLElement[];
    expect(children[1].scrollIntoView).toHaveBeenCalled();
  });

  it("renders no gutter buttons when all entries fit", () => {
    render(
      <AlbumGroupRow
        title="Fits"
        entries={[
          <span key="1" data-width="80">
            A
          </span>,
          <span key="2" data-width="80">
            B
          </span>,
        ]}
      />,
    );
    const region = screen.getByRole("region", { name: "Fits carousel" });
    applyFitsOnScreen(region);
    fireEvent.scroll(region);

    expect(screen.queryByRole("button", { name: "Scroll left" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scroll right" })).not.toBeInTheDocument();
  });

  it("provides keyboard-focusable scroll buttons with aria labels", () => {
    const entries = Array.from({ length: 6 }, (_, i) => (
      <span key={i} data-width="160">
        Item {i}
      </span>
    ));
    render(<AlbumGroupRow title="A11y" entries={entries} />);
    const region = screen.getByRole("region", { name: "A11y carousel" });
    applyOverflowToRegion(region);
    fireEvent.scroll(region);

    const right = screen.getByRole("button", { name: "Scroll right" });
    expect(right).toHaveAttribute("aria-label", "Scroll right");
    right.focus();
    expect(document.activeElement).toBe(right);
  });
});
