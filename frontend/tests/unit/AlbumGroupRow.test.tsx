import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlbumGroupRow } from "@/components/albums/AlbumGroupRow";

describe("AlbumGroupRow", () => {
  it("renders nothing when entries are empty", () => {
    const { container } = render(<AlbumGroupRow title="Empty" entries={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders at most 5 entries", () => {
    const entries = Array.from({ length: 7 }, (_, i) => <span key={i}>Item {i}</span>);
    render(<AlbumGroupRow title="Test" entries={entries} />);
    expect(screen.getAllByText(/Item/)).toHaveLength(5);
  });

  it("uses h2 heading", () => {
    render(<AlbumGroupRow title="Recently Played" entries={[<span key="1">A</span>]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Recently Played" })).toBeInTheDocument();
  });
});
