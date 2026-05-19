import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AlbumsHomePage } from "@/pages/AlbumsHomePage";
import * as useAlbumGroupsModule from "@/hooks/use-album-groups";

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
    vi.spyOn(useAlbumGroupsModule, "useAlbumGroups").mockReturnValue({
      data: {
        recentlyPlayed: [{ id: "1", title: "Played", artist: "A" }],
        recentlyAdded: [],
        hiddenGems: [],
        randomPicks: [{ id: "2", title: "Random", artist: "B" }],
        artistSpotlights: [],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAlbumGroupsModule.useAlbumGroups>);

    renderPage();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Recently Played", "Random Picks"]);
    expect(screen.getByLabelText("Browse all albums")).toBeInTheDocument();
  });
});
