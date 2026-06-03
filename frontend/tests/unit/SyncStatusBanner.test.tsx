import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SyncStatusBanner } from "@/components/stats/SyncStatusBanner";

const base = {
  connected: true,
  username: "listener",
  syncedPages: 1,
  pending: 0,
  lastError: null,
  lastSyncedAt: "2026-01-01T12:00:00.000Z",
} as const;

describe("SyncStatusBanner", () => {
  it("renders nothing when not connected", () => {
    const { container } = render(
      <SyncStatusBanner status={{ ...base, connected: false, username: null }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows syncing state", () => {
    render(<SyncStatusBanner status={{ ...base, status: "syncing" }} />);
    expect(screen.getByText(/syncing history/i)).toBeInTheDocument();
  });

  it("shows idle state with last synced time", () => {
    render(<SyncStatusBanner status={{ ...base, status: "idle" }} />);
    expect(screen.getByText(/up to date/i)).toBeInTheDocument();
    expect(screen.getByText(/last synced/i)).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(
      <SyncStatusBanner
        status={{ ...base, status: "error", lastError: "Rate limited" }}
      />,
    );
    expect(screen.getByText(/sync error/i)).toBeInTheDocument();
    expect(screen.getByText(/rate limited/i)).toBeInTheDocument();
  });
});
