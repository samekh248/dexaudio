import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ViewAllLink } from "@/components/albums/ViewAllLink";

describe("ViewAllLink", () => {
  it("links recently added to category route", () => {
    render(
      <MemoryRouter>
        <ViewAllLink groupKey="recently-added" groupTitle="Recently Added" />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /view all recently added/i });
    expect(link).toHaveAttribute("href", "/library/recently-added");
  });

  it("returns null for random-picks", () => {
    const { container } = render(
      <MemoryRouter>
        <ViewAllLink groupKey="random-picks" groupTitle="Random Picks" />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});
