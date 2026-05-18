import { describe, expect, it } from "vitest";
import {
  queueReducerAdd,
  queueReducerPlayNow,
  type QueueItem,
} from "@/stores/playback-queue-store";
import type { Track } from "@dexaudio/shared-types";

const track = (id: string): Track => ({
  id,
  title: `Track ${id}`,
  artist: "Artist",
  album: "Album",
  durationMs: 180000,
  format: "mp3",
});

describe("playback queue reducer rules", () => {
  it("play now replaces current and keeps user items", () => {
    const existing: QueueItem[] = [
      { track: track("1"), source: "user" },
      { track: track("2"), source: "auto" },
    ];
    const result = queueReducerPlayNow(existing, [track("new")]);
    expect(result[0].track.id).toBe("new");
    expect(result.some((i) => i.source === "auto")).toBe(false);
    expect(result.filter((i) => i.source === "user")).toHaveLength(2);
  });

  it("add to queue appends user items", () => {
    const existing: QueueItem[] = [{ track: track("1"), source: "user" }];
    const result = queueReducerAdd(existing, [track("2")]);
    expect(result).toHaveLength(2);
    expect(result[1].source).toBe("user");
  });
});
