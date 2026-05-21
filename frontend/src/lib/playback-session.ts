import type { Track } from "@dexaudio/shared-types";
import { getItem, removeItem, setItem, StorageKeys } from "@/lib/local-storage";
import type { QueueSource } from "@/stores/playback-queue-store";

export const PLAYBACK_SESSION_SCHEMA_VERSION = 1;
export const MAX_QUEUE_ITEMS = 200;

export const RESTORE_FAILURE_MESSAGE =
  "Couldn't restore your last playback session.";

export type RestoreOutcome =
  | "restored"
  | "empty_no_snapshot"
  | "cleared_library_mismatch"
  | "cleared_corrupt"
  | "cleared_sign_out";

export interface PersistedQueueItem {
  track: Track;
  source: QueueSource;
}

export interface PlaybackSessionSnapshot {
  schemaVersion: typeof PLAYBACK_SESSION_SCHEMA_VERSION;
  libraryId: string;
  items: PersistedQueueItem[];
  currentIndex: number | null;
  elapsedMs?: number;
  savedAt: string;
}

export type ValidateResult =
  | { ok: true; snapshot: PlaybackSessionSnapshot }
  | { ok: false; reason: "corrupt" | "library_mismatch" | "oversize" };

function isQueueSource(value: unknown): value is QueueSource {
  return value === "user" || value === "auto" || value === "queued";
}

function isTrack(value: unknown): value is Track {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.artist === "string" &&
    typeof t.album === "string" &&
    typeof t.durationMs === "number" &&
    t.durationMs >= 0 &&
    typeof t.format === "string"
  );
}

function isPersistedQueueItem(value: unknown): value is PersistedQueueItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return isTrack(item.track) && isQueueSource(item.source);
}

export function validateSnapshot(
  raw: unknown,
  activeLibraryId: string,
): ValidateResult {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "corrupt" };

  const data = raw as Record<string, unknown>;
  if (data.schemaVersion !== PLAYBACK_SESSION_SCHEMA_VERSION) {
    return { ok: false, reason: "corrupt" };
  }
  if (typeof data.libraryId !== "string" || data.libraryId.length === 0) {
    return { ok: false, reason: "corrupt" };
  }
  if (data.libraryId !== activeLibraryId) {
    return { ok: false, reason: "library_mismatch" };
  }
  if (!Array.isArray(data.items)) return { ok: false, reason: "corrupt" };
  if (data.items.length > MAX_QUEUE_ITEMS) return { ok: false, reason: "oversize" };
  if (!data.items.every(isPersistedQueueItem)) {
    return { ok: false, reason: "corrupt" };
  }

  const currentIndex = data.currentIndex;
  if (currentIndex !== null && (typeof currentIndex !== "number" || currentIndex < 0)) {
    return { ok: false, reason: "corrupt" };
  }
  if (currentIndex !== null && currentIndex >= data.items.length) {
    return { ok: false, reason: "corrupt" };
  }

  let elapsedMs: number | undefined;
  if (currentIndex !== null) {
    if (data.elapsedMs !== undefined) {
      if (typeof data.elapsedMs !== "number" || data.elapsedMs < 0) {
        return { ok: false, reason: "corrupt" };
      }
      const track = (data.items[currentIndex] as PersistedQueueItem).track;
      elapsedMs = Math.min(data.elapsedMs, track.durationMs);
    } else {
      elapsedMs = 0;
    }
  }

  if (typeof data.savedAt !== "string" || Number.isNaN(Date.parse(data.savedAt))) {
    return { ok: false, reason: "corrupt" };
  }

  return {
    ok: true,
    snapshot: {
      schemaVersion: PLAYBACK_SESSION_SCHEMA_VERSION,
      libraryId: data.libraryId,
      items: data.items as PersistedQueueItem[],
      currentIndex: currentIndex as number | null,
      ...(elapsedMs !== undefined ? { elapsedMs } : {}),
      savedAt: data.savedAt,
    },
  };
}

export function clearPlaybackSession(): void {
  removeItem(StorageKeys.playbackSession);
}

export function saveSnapshot(snapshot: PlaybackSessionSnapshot): void {
  if (!snapshot.libraryId) return;
  try {
    setItem(StorageKeys.playbackSession, snapshot);
  } catch {
    // Quota / private browsing — session stays in memory only
  }
}

export function loadSnapshot(activeLibraryId: string): {
  snapshot: PlaybackSessionSnapshot | null;
  outcome: RestoreOutcome;
} {
  if (!activeLibraryId) {
    return { snapshot: null, outcome: "empty_no_snapshot" };
  }

  let raw: unknown;
  try {
    const stored = localStorage.getItem(StorageKeys.playbackSession);
    if (stored === null) {
      return { snapshot: null, outcome: "empty_no_snapshot" };
    }
    raw = JSON.parse(stored) as unknown;
  } catch {
    clearPlaybackSession();
    return { snapshot: null, outcome: "cleared_corrupt" };
  }

  const result = validateSnapshot(raw, activeLibraryId);
  if (!result.ok) {
    clearPlaybackSession();
    if (result.reason === "library_mismatch") {
      return { snapshot: null, outcome: "cleared_library_mismatch" };
    }
    return { snapshot: null, outcome: "cleared_corrupt" };
  }

  return { snapshot: result.snapshot, outcome: "restored" };
}

export function notifyRestoreFailure(outcome: RestoreOutcome): boolean {
  return outcome === "cleared_corrupt";
}
