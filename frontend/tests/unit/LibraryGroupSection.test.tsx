import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LibraryGroupSection } from "@/components/albums/LibraryGroupSection";

describe("LibraryGroupSection", () => {
  it("renders skeleton when loading", () => {
    render(
      <LibraryGroupSection
        title="Recently Played"
        groupKey="recently-played"
        query={{ isPending: true, isError: false, isFetching: true, data: undefined, refetch: vi.fn() } as never}
      >
        {() => null}
      </LibraryGroupSection>,
    );
    expect(screen.getByRole("heading", { name: "Recently Played" })).toBeInTheDocument();
  });

  it("renders error and Retry", () => {
    const refetch = vi.fn();
    render(
      <LibraryGroupSection
        title="Hidden Gems"
        groupKey="hidden-gems"
        query={{ isPending: false, isError: true, isFetching: false, data: undefined, refetch } as never}
      >
        {() => null}
      </LibraryGroupSection>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("hides section when items empty", () => {
    const { container } = render(
      <LibraryGroupSection
        title="Recently Added"
        groupKey="recently-added"
        query={{
          isPending: false,
          isError: false,
          isFetching: false,
          data: { items: [] },
          refetch: vi.fn(),
        } as never}
      >
        {() => <p>child</p>}
      </LibraryGroupSection>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders children when success", () => {
    render(
      <MemoryRouter>
        <LibraryGroupSection
          title="Recently Played"
          groupKey="recently-played"
          query={{
            isPending: false,
            isError: false,
            isFetching: false,
            data: { items: [{ id: "1", title: "A", artist: "B" }] },
            refetch: vi.fn(),
          } as never}
        >
          {() => <p>Loaded</p>}
        </LibraryGroupSection>
      </MemoryRouter>,
    );
    expect(screen.getByText("Loaded")).toBeInTheDocument();
  });
});
