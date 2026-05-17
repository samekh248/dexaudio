import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopTenList } from "@/components/stats/TopTenList";

describe("TopTenList", () => {
  it("shows empty state", () => {
    render(<TopTenList title="Top songs" items={[]} />);
    expect(screen.getByText(/no play history/i)).toBeInTheDocument();
  });

  it("renders ranked items", () => {
    render(
      <TopTenList
        title="Top songs"
        items={[{ label: "Song A", sub: "Artist", count: 42 }]}
      />,
    );
    expect(screen.getByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
