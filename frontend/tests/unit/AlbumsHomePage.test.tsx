import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AlbumsHomePage } from "@/pages/AlbumsHomePage";
import * as homeGroupsModule from "@/hooks/use-library-home-groups";

vi.mock("@/lib/local-storage", () => ({
  getItem: () => "lib-1",
  StorageKeys: { activeLibraryId: "activeLibraryId" },
}));

function renderPage() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AlbumsHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AlbumsHomePage", () => {
  it("renders groups in order and hides empty groups", () => {
    vi.spyOn(homeGroupsModule, "useLibraryHomeGroups").mockReturnValue({
      recentlyPlayed: {
        data: { items: [{ id: "1", title: "Played", artist: "A" }] },
        isPending: false,
        isSuccess: true,
        isFetched: true,
        isError: false,
        isFetching: false,
        refetch: vi.fn(),
      },
      recentlyAdded: {
        data: { items: [] },
        isPending: false,
        isSuccess: true,
        isFetched: true,
        isError: false,
        isFetching: false,
        refetch: vi.fn(),
      },
      hiddenGems: {
        data: { items: [] },
        isPending: false,
        isSuccess: true,
        isFetched: true,
        isError: false,
        isFetching: false,
        refetch: vi.fn(),
      },
      randomPicks: {
        data: { items: [{ id: "2", title: "Random", artist: "B" }] },
        isPending: false,
        isSuccess: true,
        isFetched: true,
        isError: false,
        isFetching: false,
        refetch: vi.fn(),
      },
      artistSpotlights: {
        data: { items: [] },
        isPending: false,
        isSuccess: true,
        isFetched: true,
        isError: false,
        isFetching: false,
        refetch: vi.fn(),
      },
      anyPending: false,
      allFetched: true,
      hasAlbums: true,
      onlyEmptySuccess: false,
    } as ReturnType<typeof homeGroupsModule.useLibraryHomeGroups>);

    renderPage();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Recently Played", "Random Picks"]);
    expect(screen.getByLabelText("Browse all albums")).toBeInTheDocument();
  });
});
