import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AlbumGroupRow } from "@/components/albums/AlbumGroupRow";

describe("AlbumGroupRow", () => {
  afterEach(() => cleanup());
  it("renders nothing when entries are empty", () => {
    const { container } = render(<AlbumGroupRow title="Empty" entries={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders all entries in carousel", () => {
    const entries = Array.from({ length: 7 }, (_, i) => <span key={i}>Item {i}</span>);
    render(<AlbumGroupRow title="Test" entries={entries} />);
    expect(screen.getAllByText(/Item/)).toHaveLength(7);
  });

  it("uses h2 heading when hideHeading is false", () => {
    render(<AlbumGroupRow title="Recently Played" entries={[<span key="1">A</span>]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Recently Played" })).toBeInTheDocument();
  });

  it("exposes focusable carousel region", () => {
    render(<AlbumGroupRow title="Test" entries={[<span key="1">A</span>]} />);
    const region = screen.getByRole("region", { name: "Test carousel" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toMatch(/overflow-x-auto/);
  });
});
