import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CategoryAlbumsPage } from "@/pages/CategoryAlbumsPage";
import * as useAlbumGroupModule from "@/hooks/use-album-group";

vi.mock("@/lib/local-storage", () => ({
  getItem: () => "lib-1",
  StorageKeys: { activeLibraryId: "activeLibraryId" },
}));

vi.mock("@/hooks/use-play-album", () => ({
  usePlayAlbum: () => vi.fn(),
}));

describe("CategoryAlbumsPage", () => {
  it("renders album grid with limit 20 data", () => {
    vi.spyOn(useAlbumGroupModule, "useAlbumGroup").mockReturnValue({
      data: {
        items: Array.from({ length: 3 }, (_, i) => ({
          id: String(i),
          title: `Album ${i}`,
          artist: "Artist",
        })),
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/library/recently-added"]}>
          <Routes>
            <Route path="/library/recently-added" element={<CategoryAlbumsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Recently Added" })).toBeInTheDocument();
    expect(screen.getByText("3 albums")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open details/ })).toHaveLength(3);
  });
});
