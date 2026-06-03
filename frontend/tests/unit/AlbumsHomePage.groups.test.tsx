import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AlbumsHomePage } from "@/pages/AlbumsHomePage";
import * as homeGroupsModule from "@/hooks/use-library-home-groups";
import { clearRevealedGroupKeys } from "@/hooks/use-library-group-reveal";

vi.mock("@/hooks/use-active-library-id", () => ({
  useActiveLibraryId: () => "lib-1",
}));

function mockQuery(data: unknown, loading = false, error = false) {
  return {
    data,
    isPending: loading,
    isSuccess: !loading && !error && data != null,
    isFetched: !loading,
    isError: error,
    isFetching: loading,
    refetch: vi.fn(),
  };
}

function renderPage() {
  const client = new QueryClient();
  client.setQueryData(["plex-connection"], { connected: true });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AlbumsHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

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

const sampleAlbum = {
  id: "a1",
  title: "Test Album",
  artist: "Artist",
  artUrl: undefined,
};

describe("AlbumsHomePage progressive groups", () => {
  beforeEach(() => {
    clearRevealedGroupKeys();
    mockMatchMedia();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shows page title and row skeletons while groups are loading", () => {
    vi.spyOn(homeGroupsModule, "useLibraryHomeGroups").mockReturnValue({
      recentlyPlayed: mockQuery(undefined, true),
      recentlyAdded: mockQuery(undefined, true),
      hiddenGems: mockQuery(undefined, true),
      randomPicks: mockQuery(undefined, true),
      artistSpotlights: mockQuery(undefined, true),
      anyPending: true,
      allFetched: false,
      hasAlbums: false,
      onlyEmptySuccess: false,
    });

    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Albums" })).toBeInTheDocument();
    expect(screen.getByText("Recently Played")).toBeInTheDocument();
    expect(screen.getByText("Recently Added")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Recently Played", { selector: "section" })[0]).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("reveals album group entries with slide class after all entries are ready", () => {
    vi.spyOn(homeGroupsModule, "useLibraryHomeGroups").mockReturnValue({
      recentlyPlayed: mockQuery({ items: [sampleAlbum, { ...sampleAlbum, id: "a2", title: "B" }] }),
      recentlyAdded: mockQuery({ items: [] }),
      hiddenGems: mockQuery({ items: [] }),
      randomPicks: mockQuery({ items: [] }),
      artistSpotlights: mockQuery({ items: [] }),
      anyPending: false,
      allFetched: true,
      hasAlbums: true,
      onlyEmptySuccess: false,
    });

    renderPage();

    const section = screen.getByRole("heading", { name: "Recently Played" }).closest("section");
    expect(document.querySelector(".library-group-entry-slide")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(section).not.toHaveAttribute("aria-busy", "true");
  });

  it("includes browse-all in random picks group reveal", () => {
    vi.spyOn(homeGroupsModule, "useLibraryHomeGroups").mockReturnValue({
      recentlyPlayed: mockQuery({ items: [] }),
      recentlyAdded: mockQuery({ items: [] }),
      hiddenGems: mockQuery({ items: [] }),
      randomPicks: mockQuery({ items: [sampleAlbum] }),
      artistSpotlights: mockQuery({ items: [] }),
      anyPending: false,
      allFetched: true,
      hasAlbums: true,
      onlyEmptySuccess: false,
    });

    renderPage();

    expect(screen.getByLabelText("Browse all albums")).toBeInTheDocument();
    expect(document.querySelector(".library-group-entry-slide")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(500);
    });
  });
});
