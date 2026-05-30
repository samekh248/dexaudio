import type { PlexTimelineState, Track } from "@dexaudio/shared-types";
import { api } from "@/services/api-client.js";

const HEARTBEAT_MS = 10_000;

let reportingEnabled = true;
let plexConnected = false;
let active: { track: Track; sessionKey: number; lastTimeMs: number } | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function isPlexRatingKey(id: string): boolean {
  return /^\d+$/.test(id);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function newSessionKey(): number {
  return Math.floor(Math.random() * 2_147_483_640) + 1;
}

async function postTimeline(
  track: Track,
  state: PlexTimelineState,
  timeMs: number,
  sessionKey: number,
): Promise<void> {
  try {
    await api.postPlexTimeline({
      ratingKey: track.id,
      state,
      timeMs,
      durationMs: track.durationMs,
      sessionKey,
    });
  } catch {
    // FR-012: never interrupt playback
  }
}

export function setPlexReportingEnabled(enabled: boolean) {
  reportingEnabled = enabled;
}

let gateRefreshInFlight: Promise<void> | null = null;

export async function refreshPlexReportingGate(): Promise<void> {
  if (gateRefreshInFlight) return gateRefreshInFlight;
  gateRefreshInFlight = (async () => {
    try {
      const conn = await api.getPlexConnection();
      plexConnected = conn.connected;
      if (conn.connected) {
        const settings = await api.getSettings();
        reportingEnabled = settings.plexPlaybackReporting?.enabled !== false;
      } else {
        reportingEnabled = false;
      }
    } catch {
      plexConnected = false;
    } finally {
      gateRefreshInFlight = null;
    }
  })();
  return gateRefreshInFlight;
}

function canReport(track: Track): boolean {
  if (!reportingEnabled || !plexConnected) return false;
  if (!track.id || !isPlexRatingKey(track.id)) return false;
  if (track.durationMs <= 0) return false;
  return true;
}

function sendStopped(track: Track, timeMs: number, sessionKey: number) {
  void postTimeline(track, "stopped", timeMs, sessionKey);
}

export async function onTrackWillChange(nextTrack: Track | null) {
  if (active) {
    sendStopped(active.track, active.lastTimeMs, active.sessionKey);
    stopHeartbeat();
    active = null;
  }
  if (nextTrack) {
    await refreshPlexReportingGate();
  }
}

export function onPlaybackPlay(track: Track, timeMs: number) {
  if (!canReport(track)) return;

  if (!active || active.track.id !== track.id) {
    stopHeartbeat();
    const sessionKey = newSessionKey();
    active = { track, sessionKey, lastTimeMs: timeMs };
    void postTimeline(track, "playing", timeMs, sessionKey);
    heartbeatTimer = setInterval(() => {
      if (!active || active.track.id !== track.id) return;
      const pos = active.lastTimeMs;
      void postTimeline(track, "playing", pos, active.sessionKey);
    }, HEARTBEAT_MS);
    return;
  }

  active.lastTimeMs = timeMs;
  void postTimeline(track, "playing", timeMs, active.sessionKey);
}

export function onPlaybackPause(track: Track, timeMs: number) {
  if (!active || active.track.id !== track.id || !canReport(track)) return;
  active.lastTimeMs = timeMs;
  stopHeartbeat();
  void postTimeline(track, "paused", timeMs, active.sessionKey);
}

export function onPlaybackProgress(track: Track, timeMs: number) {
  if (!active || active.track.id !== track.id) return;
  active.lastTimeMs = timeMs;
}

export function onPlaybackStop(track: Track, timeMs: number) {
  if (!active || active.track.id !== track.id) return;
  if (!canReport(track)) {
    stopHeartbeat();
    active = null;
    return;
  }
  sendStopped(track, timeMs, active.sessionKey);
  stopHeartbeat();
  active = null;
}

/** @internal test-only */
export function _resetReporterState() {
  stopHeartbeat();
  active = null;
  reportingEnabled = true;
  plexConnected = false;
}

/** @internal test-only */
export function _getActiveSessionKey(): number | null {
  return active?.sessionKey ?? null;
}
