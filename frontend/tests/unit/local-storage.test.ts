import { describe, expect, it, beforeEach } from "vitest";
import { clearPlaybackSession, saveSnapshot } from "@/lib/playback-session";
import { getItem, setActiveLibraryId, setItem, StorageKeys } from "@/lib/local-storage";

describe("localStorage helpers", () => {
  beforeEach(() => localStorage.clear());

  it("returns fallback when key missing", () => {
    expect(getItem(StorageKeys.themeMode, "light")).toBe("light");
  });

  it("round-trips JSON values", () => {
    setItem(StorageKeys.autoQueueSimilar, false);
    expect(getItem(StorageKeys.autoQueueSimilar, true)).toBe(false);
  });

  it("clears playback session when active library changes", () => {
    setActiveLibraryId("lib-a");
    saveSnapshot({
      schemaVersion: 1,
      libraryId: "lib-a",
      items: [],
      currentIndex: null,
      savedAt: new Date().toISOString(),
    });
    setActiveLibraryId("lib-b");
    expect(localStorage.getItem(StorageKeys.playbackSession)).toBeNull();
    clearPlaybackSession();
  });
});
