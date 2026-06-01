import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { LibraryGroupReveal } from "@/components/albums/LibraryGroupReveal";
import { GroupRevealEntry } from "@/components/albums/GroupRevealEntry";
import { REVEALED_GROUP_KEYS, clearRevealedGroupKeys } from "@/hooks/use-library-group-reveal";

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

function ReadyEntry({ index }: { index: number }) {
  return (
    <GroupRevealEntry index={index} ready>
      <div data-testid={`entry-${index}`}>Card {index}</div>
    </GroupRevealEntry>
  );
}

describe("LibraryGroupReveal", () => {
  beforeEach(() => {
    clearRevealedGroupKeys();
    mockMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("hides children while preparing", () => {
    render(
      <LibraryGroupReveal libraryId="lib-1" groupKey="recently-played" entryCount={1}>
        <GroupRevealEntry index={0} ready={false}>
          <div>Hidden card</div>
        </GroupRevealEntry>
      </LibraryGroupReveal>,
    );

    const container = screen.getByText("Hidden card").parentElement?.parentElement;
    expect(container).toHaveClass("opacity-0");
    expect(container).toHaveAttribute("aria-hidden", "true");
  });

  it("applies slide class when animating", () => {
    render(
      <LibraryGroupReveal libraryId="lib-1" groupKey="hidden-gems" entryCount={2}>
        <ReadyEntry index={0} />
        <ReadyEntry index={1} />
      </LibraryGroupReveal>,
    );

    const entry = screen.getByTestId("entry-0").parentElement;
    expect(entry).toHaveClass("library-group-entry-slide");
  });

  it("uses fade-only container class when reduced motion is enabled", () => {
    mockMatchMedia(true);

    render(
      <LibraryGroupReveal libraryId="lib-1" groupKey="recently-added" entryCount={1}>
        <ReadyEntry index={0} />
      </LibraryGroupReveal>,
    );

    const entry = screen.getByTestId("entry-0").parentElement;
    expect(entry).not.toHaveClass("library-group-entry-slide");
    expect(screen.getByTestId("entry-0").parentElement?.parentElement).toHaveClass(
      "library-group-reveal-fade",
    );
  });

  it("skips animation when session key is cached", () => {
    REVEALED_GROUP_KEYS.add("lib-1:recently-played");

    render(
      <LibraryGroupReveal libraryId="lib-1" groupKey="recently-played" entryCount={2}>
        <ReadyEntry index={0} />
        <ReadyEntry index={1} />
      </LibraryGroupReveal>,
    );

    expect(screen.getByTestId("entry-0").parentElement).not.toHaveClass(
      "library-group-entry-slide",
    );
  });

  it("notifies onPhaseChange as reveal progresses", () => {
    const onPhaseChange = vi.fn();

    const { rerender } = render(
      <LibraryGroupReveal
        libraryId="lib-1"
        groupKey="random-picks"
        entryCount={1}
        onPhaseChange={onPhaseChange}
      >
        <GroupRevealEntry index={0} ready={false}>
          <div>Card</div>
        </GroupRevealEntry>
      </LibraryGroupReveal>,
    );

    expect(onPhaseChange).toHaveBeenCalledWith("preparing");

    rerender(
      <LibraryGroupReveal
        libraryId="lib-1"
        groupKey="random-picks"
        entryCount={1}
        onPhaseChange={onPhaseChange}
      >
        <ReadyEntry index={0} />
      </LibraryGroupReveal>,
    );

    expect(onPhaseChange).toHaveBeenCalledWith("animating");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onPhaseChange).toHaveBeenCalledWith("revealed");
  });
});
