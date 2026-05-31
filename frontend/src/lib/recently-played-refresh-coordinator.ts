import type { QueryClient } from "@tanstack/react-query";
import { refreshPlexReportingGate } from "@/lib/plex-playback-reporter.js";
import { recentlyPlayedGroupQueryKey } from "@/lib/recently-played-query-keys.js";

const DWELL_MS = 5_000;
const COMPLETION_WINDOW_MS = 45_000;
const RETRY_DELAYS_MS = [3_000, 8_000, 15_000, 30_000, 40_000] as const;
const TRACE_PREFIX = "[recently-played-refresh]";

function trace(event: string, details?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  if (details) {
    console.debug(`${TRACE_PREFIX} ${event}`, details);
    return;
  }
  console.debug(`${TRACE_PREFIX} ${event}`);
}

export type CoordinatorPhase = "idle" | "dwelling" | "fetching";

type BindDeps = {
  queryClient: QueryClient;
  getLibraryId: () => string;
};

let bound: BindDeps | null = null;
let phase: CoordinatorPhase = "idle";
let generation = 0;
let notifyGeneration = 0;
let dwellTimer: ReturnType<typeof setTimeout> | null = null;
let completionTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimers: ReturnType<typeof setTimeout>[] = [];
let targetAlbumId: string | null = null;
let activeFetchGeneration = 0;

function clearDwellTimer() {
  if (dwellTimer) {
    clearTimeout(dwellTimer);
    dwellTimer = null;
  }
}

function clearRetryTimers() {
  for (const t of retryTimers) clearTimeout(t);
  retryTimers = [];
}

function clearCompletionTimer() {
  if (completionTimer) {
    clearTimeout(completionTimer);
    completionTimer = null;
  }
}

function cancelInFlight() {
  trace("cancel_in_flight", {
    phase,
    generation,
    activeFetchGeneration,
    targetAlbumId,
  });
  clearDwellTimer();
  clearRetryTimers();
  clearCompletionTimer();
  generation += 1;
  activeFetchGeneration = generation;
  if (phase !== "idle") phase = "idle";
  trace("cancel_in_flight_done", { generation, activeFetchGeneration, phase });
}

async function refetchRecentlyPlayed(fetchGen: number) {
  if (!bound) {
    trace("refetch_skipped_unbound", { fetchGen });
    return;
  }
  const libraryId = bound.getLibraryId();
  if (!libraryId) {
    trace("refetch_skipped_no_library", { fetchGen });
    return;
  }

  trace("refetch_start", { fetchGen, libraryId, phase, targetAlbumId });

  await bound.queryClient.refetchQueries({
    queryKey: recentlyPlayedGroupQueryKey(libraryId),
    exact: false,
    type: "all",
  });

  if (fetchGen !== activeFetchGeneration) {
    trace("refetch_stale_generation", { fetchGen, activeFetchGeneration });
    return;
  }

  trace("refetch_done", { fetchGen, activeFetchGeneration, phase, targetAlbumId });
}

function scheduleRetries(fetchGen: number) {
  clearRetryTimers();
  for (const delay of RETRY_DELAYS_MS) {
    if (delay >= COMPLETION_WINDOW_MS) continue;
    trace("retry_scheduled", { fetchGen, delay });
    const timer = setTimeout(() => {
      if (fetchGen !== activeFetchGeneration) {
        trace("retry_skipped_stale_generation", { fetchGen, activeFetchGeneration, delay });
        return;
      }
      trace("retry_fire", { fetchGen, delay, targetAlbumId });
      void refetchRecentlyPlayed(fetchGen);
    }, delay);
    retryTimers.push(timer);
  }
}

async function startFetch() {
  if (!bound) {
    trace("start_fetch_skipped_unbound");
    return;
  }
  phase = "fetching";
  const fetchGen = generation;
  activeFetchGeneration = fetchGen;
  trace("start_fetch", { fetchGen, phase, targetAlbumId });

  clearCompletionTimer();
  completionTimer = setTimeout(() => {
    if (fetchGen !== activeFetchGeneration) {
      trace("completion_timer_skipped_stale_generation", { fetchGen, activeFetchGeneration });
      return;
    }
    phase = "idle";
    clearRetryTimers();
    trace("completion_timer_idle", { fetchGen, phase, targetAlbumId });
  }, COMPLETION_WINDOW_MS);

  scheduleRetries(fetchGen);
  await refetchRecentlyPlayed(fetchGen);
}

function scheduleDwell(albumId: string) {
  clearDwellTimer();
  targetAlbumId = albumId;
  phase = "dwelling";
  trace("dwell_scheduled", { albumId, dwellMs: DWELL_MS, generation, phase });

  dwellTimer = setTimeout(() => {
    dwellTimer = null;
    if (targetAlbumId !== albumId) {
      trace("dwell_skipped_target_changed", { albumId, targetAlbumId });
      return;
    }
    trace("dwell_fire", { albumId, generation });
    void startFetch();
  }, DWELL_MS);
}

export function bindRecentlyPlayedRefresh(deps: BindDeps): void {
  bound = deps;
  trace("bind", { hasBound: !!bound });
}

export function resetRecentlyPlayedRefresh(): void {
  notifyGeneration += 1;
  trace("reset", { notifyGeneration, targetAlbumId, phase });
  cancelInFlight();
  targetAlbumId = null;
  phase = "idle";
  trace("reset_done", { notifyGeneration, targetAlbumId, phase });
}

export function notifyAudibleAlbumChange(event: { albumId: string; trackId: string }): void {
  if (!bound) {
    trace("notify_skipped_unbound", event);
    return;
  }
  if (!event.albumId) {
    trace("notify_skipped_missing_album", event);
    return;
  }

  trace("notify", {
    albumId: event.albumId,
    trackId: event.trackId,
    phase,
    targetAlbumId,
    generation,
  });

  // Keep gate status fresh for reporter internals, but do not block the
  // Recently Played query refresh flow on connectivity/reporting toggles.
  void refreshPlexReportingGate();
  trace("gate_refresh_requested", { albumId: event.albumId });

  const libraryId = bound.getLibraryId();
  if (!libraryId) {
    trace("notify_skipped_no_library", {
      albumId: event.albumId,
      trackId: event.trackId,
      phase,
    });
    return;
  }

  if (phase !== "idle" && targetAlbumId === event.albumId) {
    trace("notify_ignored_same_album_non_idle", {
      albumId: event.albumId,
      phase,
      targetAlbumId,
    });
    return;
  }

  if (targetAlbumId !== event.albumId) {
    cancelInFlight();
  }

  scheduleDwell(event.albumId);
}

/** @internal test-only */
export function _resetCoordinatorState(): void {
  notifyGeneration += 1;
  resetRecentlyPlayedRefresh();
  bound = null;
}

/** @internal test-only */
export function _getCoordinatorPhase(): CoordinatorPhase {
  return phase;
}

/** @internal test-only */
export function _getTargetAlbumId(): string | null {
  return targetAlbumId;
}
