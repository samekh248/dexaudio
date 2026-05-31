import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  _getCoordinatorPhase,
  _getTargetAlbumId,
  _resetCoordinatorState,
  bindRecentlyPlayedRefresh,
  notifyAudibleAlbumChange,
  resetRecentlyPlayedRefresh,
  type CoordinatorPhase,
} from "@/lib/recently-played-refresh-coordinator.js";
import { recentlyPlayedGroupQueryKey } from "@/lib/recently-played-query-keys.js";
import {
  refreshPlexReportingGate,
  setPlexReportingEnabled,
  _resetReporterState,
} from "@/lib/plex-playback-reporter.js";

vi.mock("@/services/api-client.js", () => ({
  api: {
    getPlexConnection: vi.fn().mockResolvedValue({ connected: true }),
    getSettings: vi.fn().mockResolvedValue({ plexPlaybackReporting: { enabled: true } }),
    postPlexTimeline: vi.fn().mockResolvedValue(undefined),
  },
}));

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function waitForPhase(expected: CoordinatorPhase): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    await flushAsync();
    if (_getCoordinatorPhase() === expected) return;
  }
  expect(_getCoordinatorPhase()).toBe(expected);
}

describe("recently-played-refresh-coordinator", () => {
  let queryClient: QueryClient;
  let refetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    _resetReporterState();
    _resetCoordinatorState();
    setPlexReportingEnabled(true);
    await refreshPlexReportingGate();

    queryClient = new QueryClient();
    refetchSpy = vi.spyOn(queryClient, "refetchQueries").mockResolvedValue(undefined as never);

    bindRecentlyPlayedRefresh({
      queryClient,
      getLibraryId: () => "lib-1",
    });
  });

  afterEach(() => {
    resetRecentlyPlayedRefresh();
    vi.clearAllTimers();
    vi.useRealTimers();
    _resetCoordinatorState();
  });

  it("starts idle before any album change", () => {
    expect(_getCoordinatorPhase()).toBe("idle");
  });

  it("enters dwelling on album change and refetches after 5 seconds", async () => {
    notifyAudibleAlbumChange({ albumId: "album-a", trackId: "t1" });
    await waitForPhase("dwelling");
    expect(_getTargetAlbumId()).toBe("album-a");
    expect(refetchSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);
    await flushAsync();

    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: recentlyPlayedGroupQueryKey("lib-1"),
      exact: false,
      type: "all",
    });
  });

  it("does not refetch when album changes before 5 second dwell completes", async () => {
    notifyAudibleAlbumChange({ albumId: "album-a", trackId: "t1" });
    await waitForPhase("dwelling");

    await vi.advanceTimersByTimeAsync(2000);
    notifyAudibleAlbumChange({ albumId: "album-b", trackId: "t2" });
    await waitForPhase("dwelling");
    expect(_getTargetAlbumId()).toBe("album-b");

    await vi.advanceTimersByTimeAsync(4000);
    expect(refetchSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    await flushAsync();

    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it("ignores duplicate notify for same album while dwelling", async () => {
    notifyAudibleAlbumChange({ albumId: "album-a", trackId: "t1" });
    await waitForPhase("dwelling");
    notifyAudibleAlbumChange({ albumId: "album-a", trackId: "t2" });
    await flushAsync();

    await vi.advanceTimersByTimeAsync(5000);
    await flushAsync();

    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it("still refetches when Plex reporting is disabled", async () => {
    const { api } = await import("@/services/api-client.js");
    vi.mocked(api.getSettings).mockResolvedValueOnce({
      plexPlaybackReporting: { enabled: false },
    });

    notifyAudibleAlbumChange({ albumId: "album-a", trackId: "t1" });
    await waitForPhase("dwelling");
    await vi.advanceTimersByTimeAsync(5000);
    await flushAsync();

    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: recentlyPlayedGroupQueryKey("lib-1"),
      exact: false,
      type: "all",
    });
  });

  it("schedules retry refetches within completion window", async () => {
    notifyAudibleAlbumChange({ albumId: "album-a", trackId: "t1" });
    await waitForPhase("dwelling");
    await vi.advanceTimersByTimeAsync(5000);
    await flushAsync();

    expect(refetchSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3000);
    await flushAsync();
    expect(refetchSpy).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5000);
    await flushAsync();
    expect(refetchSpy).toHaveBeenCalledTimes(3);
  });

  it("reset clears pending dwell", async () => {
    notifyAudibleAlbumChange({ albumId: "album-a", trackId: "t1" });
    await waitForPhase("dwelling");
    resetRecentlyPlayedRefresh();

    await vi.advanceTimersByTimeAsync(10000);
    await flushAsync();

    expect(refetchSpy).not.toHaveBeenCalled();
    expect(_getCoordinatorPhase()).toBe("idle");
  });

  it("refetch query key does not match other library groups", () => {
    const recentlyPlayed = recentlyPlayedGroupQueryKey("lib-1");
    const recentlyAdded = ["album-group", "recently-added", "lib-1"] as const;
    const hiddenGems = ["album-group", "hidden-gems", "lib-1"] as const;

    expect(recentlyPlayed[1]).toBe("recently-played");
    expect(recentlyAdded[1]).not.toBe(recentlyPlayed[1]);
    expect(hiddenGems[1]).not.toBe(recentlyPlayed[1]);
  });
});
