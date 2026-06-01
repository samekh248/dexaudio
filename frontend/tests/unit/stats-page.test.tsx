import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopTenList } from "@/components/stats/TopTenList";
import { OverviewCards } from "@/components/stats/OverviewCards";

describe("TopTenList", () => {
  it("shows empty state", () => {
    render(<TopTenList title="Top songs" items={[]} />);
    expect(screen.getByText(/no play history/i)).toBeInTheDocument();
  });

  it("renders ranked items with artwork", () => {
    const { container } = render(
      <TopTenList
        title="Top songs"
        items={[{ label: "Song A", sub: "Artist", count: 42, imageUrl: "http://example.com/a.jpg" }]}
      />,
    );
    expect(screen.getByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "http://example.com/a.jpg");
  });
});

describe("OverviewCards", () => {
  it("shows overview totals", () => {
    render(
      <OverviewCards
        overview={{
          period: "1m",
          source: "plex",
          totalPlays: 10,
          totalPlaysAllTime: 10,
          uniqueArtists: 2,
          uniqueAlbums: 1,
          uniqueTracks: 3,
          avgPlaysPerDay: 1,
          topArtists: [],
          topAlbums: [],
          topTracks: [],
        }}
      />,
    );
    expect(screen.getByText(/plays in period/i)).toBeInTheDocument();
    expect(screen.getAllByText("10").length).toBeGreaterThanOrEqual(1);
  });
});
