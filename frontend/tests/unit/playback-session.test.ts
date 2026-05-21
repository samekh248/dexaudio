import { beforeEach, describe, expect, it } from "vitest";
import type { Track } from "@dexaudio/shared-types";
import {
  clearPlaybackSession,
  loadSnapshot,
  notifyRestoreFailure,
  RESTORE_FAILURE_MESSAGE,
  saveSnapshot,
  validateSnapshot,
  type PlaybackSessionSnapshot,
} from "@/lib/playback-session";
import { StorageKeys } from "@/lib/local-storage";

const track = (id: string, durationMs = 120_000): Track => ({
  id,
  title: id,
  artist: "Artist",
  album: "Album",
  durationMs,
  format: "mp3",
});

function snapshot(overrides: Partial<PlaybackSessionSnapshot> = {}): PlaybackSessionSnapshot {
  return {
    schemaVersion: 1,
    libraryId: "lib-1",
    items: [{ track: track("a"), source: "user" }],
    currentIndex: null,
    savedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("playback-session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("saveSnapshot / loadSnapshot", () => {
    it("round-trips a queue-only snapshot", () => {
      const data = snapshot({ currentIndex: null });
      saveSnapshot(data);
      const { snapshot: loaded, outcome } = loadSnapshot("lib-1");
      expect(outcome).toBe("restored");
      expect(loaded).toEqual(data);
    });

    it("round-trips current index and elapsed position", () => {
      const data = snapshot({ currentIndex: 0, elapsedMs: 30_000 });
      saveSnapshot(data);
      const { snapshot: loaded } = loadSnapshot("lib-1");
      expect(loaded?.currentIndex).toBe(0);
      expect(loaded?.elapsedMs).toBe(30_000);
    });
  });

  describe("validateSnapshot", () => {
    it("rejects library mismatch", () => {
      saveSnapshot(snapshot());
      const { outcome } = loadSnapshot("other-lib");
      expect(outcome).toBe("cleared_library_mismatch");
      expect(localStorage.getItem(StorageKeys.playbackSession)).toBeNull();
    });

    it("rejects oversize queue", () => {
      const items = Array.from({ length: 201 }, (_, i) => ({
        track: track(String(i)),
        source: "user" as const,
      }));
      const result = validateSnapshot(
        { ...snapshot(), items, currentIndex: null },
        "lib-1",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("oversize");
    });

    it("clamps elapsedMs to track duration", () => {
      const result = validateSnapshot(
        {
          ...snapshot(),
          currentIndex: 0,
          elapsedMs: 999_999,
        },
        "lib-1",
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.snapshot.elapsedMs).toBe(120_000);
    });
  });

  describe("loadSnapshot failure paths", () => {
    it("returns cleared_corrupt for invalid JSON", () => {
      localStorage.setItem(StorageKeys.playbackSession, "{not json");
      const { outcome } = loadSnapshot("lib-1");
      expect(outcome).toBe("cleared_corrupt");
    });

    it("returns empty_no_snapshot when key missing", () => {
      const { outcome } = loadSnapshot("lib-1");
      expect(outcome).toBe("empty_no_snapshot");
    });
  });

  describe("clearPlaybackSession", () => {
    it("removes persisted session", () => {
      saveSnapshot(snapshot());
      clearPlaybackSession();
      expect(localStorage.getItem(StorageKeys.playbackSession)).toBeNull();
    });
  });

  describe("notifyRestoreFailure", () => {
    it("flags corrupt restore for toast", () => {
      expect(notifyRestoreFailure("cleared_corrupt")).toBe(true);
      expect(notifyRestoreFailure("restored")).toBe(false);
    });

    it("exposes user-facing message constant", () => {
      expect(RESTORE_FAILURE_MESSAGE).toContain("restore");
    });
  });
});
