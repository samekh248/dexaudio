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
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AlbumsHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AlbumsHomePage progressive groups", () => {
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
});
