import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AlbumCard } from "@/components/albums/AlbumCard";

vi.mock("@/hooks/use-play-album", () => ({
  usePlayAlbum: () => vi.fn(),
}));

describe("AlbumCard sizing", () => {
  it("uses 160px card width", () => {
    const { container } = render(
      <MemoryRouter>
        <AlbumCard album={{ id: "1", title: "T", artist: "A" }} />
      </MemoryRouter>,
    );
    const card = container.querySelector(".w-\\[160px\\]");
    expect(card).toBeTruthy();
  });
});
