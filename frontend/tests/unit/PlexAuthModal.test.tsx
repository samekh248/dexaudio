import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlexAuthModal } from "@/components/plex-auth/PlexAuthModal";

vi.mock("@/services/api-client", () => ({
  api: {
    createPlexPin: vi.fn().mockResolvedValue({ pinId: 1, pinCode: "ABCD", authUrl: "https://app.plex.tv/auth" }),
    getPlexPinStatus: vi.fn().mockResolvedValue({ authorized: false }),
    getPlexAuthServers: vi.fn().mockResolvedValue([]),
    completePlexAuth: vi.fn(),
  },
}));

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe("PlexAuthModal", () => {
  it("shows step indicator on sign-in step", () => {
    render(
      wrap(
        <PlexAuthModal open mode="onboarding" onOpenChange={() => {}} onComplete={() => {}} />,
      ),
    );
    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
  });
});
