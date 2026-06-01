import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LibraryGroupSection } from "@/components/albums/LibraryGroupSection";
import { GroupRevealEntry } from "@/components/albums/GroupRevealEntry";
import { clearRevealedGroupKeys } from "@/hooks/use-library-group-reveal";

function mockMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("LibraryGroupSection", () => {
  afterEach(() => {
    cleanup();
    clearRevealedGroupKeys();
    vi.useRealTimers();
  });

  it("renders skeleton when loading", () => {
    render(
      <LibraryGroupSection
        title="Recently Played"
        groupKey="recently-played"
        libraryId="lib-1"
        query={{ isPending: true, isError: false, isFetching: true, data: undefined, refetch: vi.fn() } as never}
      >
        {() => null}
      </LibraryGroupSection>,
    );
    expect(screen.getByRole("heading", { name: "Recently Played" })).toBeInTheDocument();
  });

  it("renders error and Retry", () => {
    const refetch = vi.fn();
    render(
      <LibraryGroupSection
        title="Hidden Gems"
        groupKey="hidden-gems"
        libraryId="lib-1"
        query={{ isPending: false, isError: true, isFetching: false, data: undefined, refetch } as never}
      >
        {() => null}
      </LibraryGroupSection>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("hides section when items empty", () => {
    const { container } = render(
      <LibraryGroupSection
        title="Recently Added"
        groupKey="recently-added"
        libraryId="lib-1"
        query={{
          isPending: false,
          isError: false,
          isFetching: false,
          data: { items: [] },
          refetch: vi.fn(),
        } as never}
      >
        {() => <p>child</p>}
      </LibraryGroupSection>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders children when success", async () => {
    mockMatchMedia();
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <LibraryGroupSection
          title="Recently Played"
          groupKey="recently-played"
          libraryId="lib-1"
          query={{
            isPending: false,
            isError: false,
            isFetching: false,
            failureCount: 0,
            data: { items: [{ id: "1", title: "A", artist: "B" }] },
            refetch: vi.fn(),
          } as never}
        >
          {() => (
            <GroupRevealEntry index={0} ready>
              <p>Loaded</p>
            </GroupRevealEntry>
          )}
        </LibraryGroupSection>
      </MemoryRouter>,
    );

    expect(screen.getByText("Loaded")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Recently Played").closest("section")).not.toHaveAttribute("aria-busy", "true");
  });

  it("renders (View all) in header when showViewAll is true", async () => {
    mockMatchMedia();
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <LibraryGroupSection
          title="Recently Added"
          groupKey="recently-added"
          libraryId="lib-1"
          query={{
            isPending: false,
            isError: false,
            isFetching: false,
            failureCount: 0,
            data: { items: [{ id: "1", title: "A", artist: "B" }] },
            refetch: vi.fn(),
          } as never}
        >
          {() => (
            <GroupRevealEntry index={0} ready>
              <p>Loaded</p>
            </GroupRevealEntry>
          )}
        </LibraryGroupSection>
      </MemoryRouter>,
    );

    const header = screen.getByRole("heading", { name: "Recently Added" }).parentElement;
    expect(header).toHaveClass("items-baseline", "gap-2");
    expect(header).not.toHaveClass("justify-between");
    const link = screen.getByRole("link", { name: /view all recently added/i });
    expect(link).toHaveTextContent("(View all)");
    expect(link).toHaveAttribute("href", "/library/recently-added");
    expect(header).toContainElement(link);

    act(() => {
      vi.advanceTimersByTime(500);
    });
  });

  it("omits (View all) when showViewAll is false", () => {
    mockMatchMedia();

    render(
      <MemoryRouter>
        <LibraryGroupSection
          title="Random Picks"
          groupKey="random-picks"
          libraryId="lib-1"
          showViewAll={false}
          query={{
            isPending: false,
            isError: false,
            isFetching: false,
            failureCount: 0,
            data: { items: [{ id: "1", title: "A", artist: "B" }] },
            refetch: vi.fn(),
          } as never}
        >
          {() => (
            <GroupRevealEntry index={0} ready>
              <p>Loaded</p>
            </GroupRevealEntry>
          )}
        </LibraryGroupSection>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: /view all/i })).not.toBeInTheDocument();
  });

  it("keeps recently-played cards visible during background refetch", () => {
    mockMatchMedia();
    vi.useFakeTimers();

    const { container } = render(
      <MemoryRouter>
        <LibraryGroupSection
          title="Recently Played"
          groupKey="recently-played"
          libraryId="lib-1"
          query={{
            isPending: false,
            isError: false,
            isFetching: true,
            failureCount: 0,
            data: { items: [{ id: "1", title: "A", artist: "B" }] },
            refetch: vi.fn(),
          } as never}
        >
          {(items) => (
            <GroupRevealEntry index={0} ready>
              <p>{items.length} albums shown</p>
            </GroupRevealEntry>
          )}
        </LibraryGroupSection>
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("1 albums shown")).toBeInTheDocument();
    expect(container.querySelector("svg.lucide-loader-circle")).toBeNull();
  });

  it("sets aria-busy while group reveal is preparing", () => {
    mockMatchMedia();

    render(
      <MemoryRouter>
        <LibraryGroupSection
          title="Hidden Gems"
          groupKey="hidden-gems"
          libraryId="lib-1"
          query={{
            isPending: false,
            isError: false,
            isFetching: false,
            failureCount: 0,
            data: { items: [{ id: "1", title: "A", artist: "B" }] },
            refetch: vi.fn(),
          } as never}
        >
          {() => (
            <GroupRevealEntry index={0} ready={false}>
              <p>Waiting</p>
            </GroupRevealEntry>
          )}
        </LibraryGroupSection>
      </MemoryRouter>,
    );

    const section = screen.getByText("Hidden Gems").closest("section");
    expect(section).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Waiting").closest("[aria-hidden='true']")).toBeTruthy();
  });
});
