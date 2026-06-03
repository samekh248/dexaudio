import type { PlayerStatus, RemotePlayDegradedResponse, Track } from "@dexaudio/shared-types";
import { toast } from "@/components/ui/sonner";
import { ApiError, api } from "@/services/api-client";
import { usePlaybackOutputStore } from "@/lib/playback-output-store";
import { getQueueCurrentTrack, usePlaybackQueue } from "@/stores/playback-queue-store";
import { updateListenPosition, startListening, checkAndScrobble } from "@/lib/scrobble-tracker";

const POLL_MS = 3000;
const QUEUE_SYNC_DEBOUNCE_MS = 400;

let remotePlaybackActive = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let queueSyncTimer: ReturnType<typeof setTimeout> | null = null;
let queueRevision = 0;
let onEndCallback: (() => void) | null = null;
let lastRatingKey: string | null = null;

export type RemoteUiState = {
  playing: boolean;
  positionMs: number;
  durationMs: number;
  status: PlayerStatus["state"];
  supportsSeek: boolean;
  degradedMessage: string | null;
};

const defaultRemoteUi: RemoteUiState = {
  playing: false,
  positionMs: 0,
  durationMs: 0,
  status: "idle",
  supportsSeek: true,
  degradedMessage: null,
};

let remoteUi: RemoteUiState = { ...defaultRemoteUi };
const listeners = new Set<(state: RemoteUiState) => void>();

function emitRemoteUi(): void {
  for (const fn of listeners) fn(remoteUi);
}

export function subscribeRemoteUi(listener: (state: RemoteUiState) => void): () => void {
  listeners.add(listener);
  listener(remoteUi);
  return () => listeners.delete(listener);
}

export function getRemoteUiState(): RemoteUiState {
  return remoteUi;
}

function clientId(): string | null {
  return usePlaybackOutputStore.getState().getNetworkClientId();
}

function queuePayload() {
  const state = usePlaybackQueue.getState();
  const ratingKeys = state.items.map((i) => i.track.id).filter((id) => /^\d+$/.test(id));
  return { ratingKeys, currentIndex: state.currentIndex };
}

async function syncQueue(interruptPlayback = false): Promise<void> {
  const id = clientId();
  if (!id) return;
  const { ratingKeys, currentIndex } = queuePayload();
  if (ratingKeys.length === 0) return;
  queueRevision += 1;
  const rev = queueRevision;
  try {
    const result = await api.syncNetworkPlayerQueue(id, {
      ratingKeys,
      currentIndex,
      interruptPlayback,
      queueRevision: rev,
    });
    if (result && "degraded" in result && result.degraded) {
      remoteUi = { ...remoteUi, degradedMessage: result.message };
      emitRemoteUi();
      toast("Limited queue sync on this player", { description: result.message });
    }
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : "Remote queue sync failed";
    remoteUi = { ...remoteUi, degradedMessage: msg };
    emitRemoteUi();
    toast("Remote sync issue", { description: msg });
  }
}

function scheduleQueueSync(interruptPlayback = false): void {
  if (queueSyncTimer) clearTimeout(queueSyncTimer);
  queueSyncTimer = setTimeout(() => {
    void syncQueue(interruptPlayback);
  }, QUEUE_SYNC_DEBOUNCE_MS);
}

function applyStatus(status: PlayerStatus): void {
  const playing = status.state === "playing";
  remoteUi = {
    ...remoteUi,
    playing,
    positionMs: status.positionMs,
    durationMs: status.durationMs || remoteUi.durationMs,
    status: status.state,
  };
  emitRemoteUi();
  if (status.ratingKey) {
    const state = usePlaybackQueue.getState();
    const idx = state.items.findIndex((i) => i.track.id === status.ratingKey);
    if (idx >= 0 && idx !== state.currentIndex) {
      usePlaybackQueue.getState().setIndex(idx);
    }
    updateListenPosition(status.positionMs);
    if (status.ratingKey !== lastRatingKey && playing) {
      lastRatingKey = status.ratingKey;
    }
    if (
      status.state === "stopped" &&
      onEndCallback &&
      status.ratingKey === lastRatingKey
    ) {
      const cb = onEndCallback;
      onEndCallback = null;
      cb();
    }
  }
}

async function pollStatus(): Promise<void> {
  const id = clientId();
  if (!id) return;
  try {
    const status = await api.getNetworkPlayerStatus(id);
    applyStatus(status);
  } catch {
    // soft fail
  }
}

function startPolling(): void {
  stopPolling();
  void pollStatus();
  pollTimer = setInterval(() => void pollStatus(), POLL_MS);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export async function switchAwayFromNetworkPlayer(): Promise<void> {
  remotePlaybackActive = false;
  const id = clientId();
  if (id) {
    try {
      await api.switchAwayFromNetworkPlayer(id);
    } catch {
      // idempotent
    }
  }
  stopPolling();
  remoteUi = { ...defaultRemoteUi };
  emitRemoteUi();
}

export async function selectLocalOutput(): Promise<void> {
  if (usePlaybackOutputStore.getState().isNetworkMode()) {
    await switchAwayFromNetworkPlayer();
  }
  usePlaybackOutputStore.getState().selectLocal();
}

export async function playOnNetworkPlayer(
  track: Track,
  onEnd?: () => void,
  options: { offsetMs?: number } = {},
): Promise<void> {
  const id = clientId();
  if (!id) {
    toast("No network player selected");
    return;
  }

  const conn = await api.getPlexConnection().catch(() => ({ connected: false }));
  if (!conn.connected) {
    toast("Plex server unreachable", {
      description: "Switch to This device for cached playback.",
      action: {
        label: "This device",
        onClick: () => void selectLocalOutput(),
      },
    });
    return;
  }

  onEndCallback = onEnd ?? null;
  lastRatingKey = track.id;
  startListening(track);
  const { ratingKeys, currentIndex } = queuePayload();
  const idx = Math.max(0, ratingKeys.indexOf(track.id));

  try {
    const result = await api.playOnNetworkPlayer(id, {
      ratingKey: track.id,
      queue: ratingKeys.length > 0 ? { ratingKeys, startIndex: idx >= 0 ? idx : currentIndex } : undefined,
      offsetMs: options.offsetMs,
    });
    if (result && "degraded" in result) {
      const d = result as RemotePlayDegradedResponse;
      toast("Limited queue sync", { description: d.message });
      remoteUi = { ...remoteUi, degradedMessage: d.message };
      emitRemoteUi();
    }
    remoteUi = { ...remoteUi, playing: true, durationMs: track.durationMs };
    emitRemoteUi();
    remotePlaybackActive = true;
    startPolling();
    scheduleQueueSync();
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 503)) {
      const pref = usePlaybackOutputStore.getState().preference;
      const name = pref.mode === "network" ? pref.displayName : "player";
      toast(`${name} is not available`, {
        description: err.message,
        action: {
          label: "This device",
          onClick: () => void selectLocalOutput(),
        },
      });
      return;
    }
    toast("Could not play on network player", {
      description: err instanceof Error ? err.message : undefined,
    });
  }
}

export async function controlNetwork(action: "pause" | "resume" | "stop" | "skipNext" | "skipPrevious" | "seek", seekToMs?: number): Promise<void> {
  const id = clientId();
  if (!id) return;
  try {
    await api.controlNetworkPlayer(id, { action, seekToMs });
    if (action === "pause") {
      remoteUi = { ...remoteUi, playing: false, status: "paused" };
    } else if (action === "resume") {
      remoteUi = { ...remoteUi, playing: true, status: "playing" };
    }
    emitRemoteUi();
    void pollStatus();
    if (action === "skipNext" || action === "skipPrevious") {
      scheduleQueueSync(true);
    }
  } catch (err) {
    toast("Remote control failed", {
      description: err instanceof ApiError ? err.message : undefined,
    });
  }
}

export function initNetworkQueueSync(): () => void {
  return usePlaybackQueue.subscribe((state, prev) => {
    if (!remotePlaybackActive) return;
    if (!usePlaybackOutputStore.getState().isNetworkMode()) return;
    if (!state.playbackStarted || state.restorePhase) return;
    if (state.items === prev.items && state.currentIndex === prev.currentIndex) return;
    scheduleQueueSync(state.currentIndex !== prev.currentIndex);
  });
}

export function teardownNetworkPlayback(): void {
  remotePlaybackActive = false;
  stopPolling();
  if (queueSyncTimer) clearTimeout(queueSyncTimer);
  onEndCallback = null;
  remoteUi = { ...defaultRemoteUi };
}

export async function scrobbleFromRemoteIfNeeded(): Promise<void> {
  if (!usePlaybackOutputStore.getState().isNetworkMode()) return;
  await checkAndScrobble();
}

export function getNetworkCurrentTrack(): Track | null {
  return getQueueCurrentTrack(usePlaybackQueue.getState());
}
