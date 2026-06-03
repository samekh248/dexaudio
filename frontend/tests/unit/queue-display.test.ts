import { describe, expect, it } from "vitest";
import { buildQueueDisplaySections, PLAYED_VISIBLE_MAX } from "@/lib/queue-display";
import type { QueueItem } from "@/stores/playback-queue-store";
import type { Track } from "@dexaudio/shared-types";

const track = (id: string): Track => ({
  id,
  title: id,
  artist: "A",
  album: "B",
  durationMs: 1000,
  format: "mp3",
});

const item = (id: string): QueueItem => ({ track: track(id), source: "user" });

describe("buildQueueDisplaySections", () => {
  it("puts all items in upcoming when playback has not started", () => {
    const items = [item("1"), item("2")];
    const sections = buildQueueDisplaySections({
      items,
      currentIndex: -1,
      playbackStarted: false,
    });
    expect(sections.played).toHaveLength(0);
    expect(sections.current).toBeNull();
    expect(sections.upcoming).toHaveLength(2);
    expect(sections.showPlayedSeparator).toBe(false);
  });

  it("shows at most PLAYED_VISIBLE_MAX tracks before current", () => {
    const items = Array.from({ length: 6 }, (_, i) => item(String(i)));
    const sections = buildQueueDisplaySections({
      items,
      currentIndex: 5,
      playbackStarted: true,
    });
    expect(sections.played).toHaveLength(PLAYED_VISIBLE_MAX);
    expect(sections.played.map((r) => r.index)).toEqual([2, 3, 4]);
    expect(sections.current?.index).toBe(5);
    expect(sections.upcoming).toHaveLength(0);
    expect(sections.showPlayedSeparator).toBe(true);
  });

  it("has no played section on first track", () => {
    const items = [item("1"), item("2")];
    const sections = buildQueueDisplaySections({
      items,
      currentIndex: 0,
      playbackStarted: true,
    });
    expect(sections.played).toHaveLength(0);
    expect(sections.showPlayedSeparator).toBe(false);
    expect(sections.current?.index).toBe(0);
    expect(sections.upcoming.map((r) => r.index)).toEqual([1]);
  });
});
