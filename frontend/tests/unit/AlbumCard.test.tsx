import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AlbumCard } from "@/components/albums/AlbumCard";

const playAlbum = vi.fn();

vi.mock("@/hooks/use-play-album", () => ({
  usePlayAlbum: () => playAlbum,
}));

describe("AlbumCard", () => {
  const album = { id: "alb-1", title: "Test Album", artist: "Artist" };

  afterEach(() => cleanup());

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
});
