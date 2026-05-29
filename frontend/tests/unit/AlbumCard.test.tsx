import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { REVEALED_URL_CACHE } from "@/hooks/use-album-cover-load";

const playAlbum = vi.fn();

vi.mock("@/hooks/use-play-album", () => ({
  usePlayAlbum: () => playAlbum,
}));

describe("AlbumCard", () => {
  const album = { id: "alb-1", title: "Test Album", artist: "Artist" };
  const albumWithArt = {
    ...album,
    artUrl: "https://example.com/cover.jpg",
  };

  afterEach(() => {
    cleanup();
    REVEALED_URL_CACHE.clear();
  });

  it("play button triggers play without navigating via details link", () => {
    render(
      <MemoryRouter>
        <AlbumCard album={album} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Play Test Album" }));
    expect(playAlbum).toHaveBeenCalledWith("alb-1");
  });

  it("details link navigates to album page", () => {
    render(
      <MemoryRouter>
        <AlbumCard album={album} />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Open details for Test Album" });
    expect(link).toHaveAttribute("href", "/albums/alb-1");
  });

  describe("cover reveal integration", () => {
    it("hides title/artist while pending", () => {
      const { container } = render(
        <MemoryRouter>
          <AlbumCard album={albumWithArt} />
        </MemoryRouter>,
      );
      const content = screen.getByText("Test Album").closest(".p-2");
      expect(content).toHaveClass("invisible");
      expect(getCoverImg(container)).toHaveClass("opacity-0");
    });

    it("shows title/artist after reveal completes", () => {
      const { container } = render(
        <MemoryRouter>
          <AlbumCard album={albumWithArt} />
        </MemoryRouter>,
      );
      const img = getCoverImg(container);

      act(() => {
        fireEvent.load(img);
        fireEvent.animationEnd(img);
      });

      const content = screen.getByText("Test Album").closest(".p-2");
      expect(content).not.toHaveClass("invisible");
    });

    it("play overlay not hover-visible until revealComplete", async () => {
      const { container } = render(
        <MemoryRouter>
          <AlbumCard album={albumWithArt} />
        </MemoryRouter>,
      );
      const playBtn = screen.getByRole("button", { hidden: true });
      expect(playBtn.className).not.toContain("group-hover:opacity-100");
      expect(playBtn).toHaveAttribute("aria-hidden", "true");

      const img = getCoverImg(container);
      await act(async () => {
        fireEvent.load(img);
        fireEvent.animationEnd(img);
      });

      await waitFor(() => {
        expect(playBtn).toHaveAttribute("aria-hidden", "false");
      });
      expect(playBtn.className).toContain("group-hover:opacity-100");
    });
  });
});

function getCoverImg(container: HTMLElement): HTMLImageElement {
  const img = container.querySelector("img");
  if (!img) throw new Error("cover img not found");
  return img;
}
