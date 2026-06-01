import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LastfmSyncProgress, lastfmPageProgress } from "@/components/stats/LastfmSyncProgress";

describe("LastfmSyncProgress", () => {
  it("computes page progress from sync status", () => {
    expect(
      lastfmPageProgress({
        connected: true,
        status: "syncing",
        syncedPages: 3,
        totalPages: 10,
      }),
    ).toEqual({
      value: 3,
      max: 10,
      label: "Page 3 of 10",
    });
  });

  it("renders a progress bar while syncing", () => {
    render(
      <LastfmSyncProgress
        status={{
          connected: true,
          status: "syncing",
          syncedPages: 2,
          totalPages: 8,
        }}
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "8");
    expect(screen.getByText("Page 2 of 8")).toBeInTheDocument();
  });

  it("renders indeterminate progress before total pages are known", () => {
    render(
      <LastfmSyncProgress
        status={{
          connected: true,
          status: "syncing",
          syncedPages: 0,
        }}
      />,
    );

    expect(screen.getByLabelText("Syncing Last.fm history")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Starting sync…")).toBeInTheDocument();
  });
});
