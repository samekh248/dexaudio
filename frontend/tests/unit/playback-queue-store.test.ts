import { describe, expect, it, beforeEach } from "vitest";
import { usePlaybackQueue } from "@/stores/playback-queue-store";
import type { Track } from "@dexaudio/shared-types";

const track = (id: string): Track => ({
  id,
  title: id,
  artist: "A",
  album: "B",
  durationMs: 1000,
  format: "mp3",
});

describe("playback queue store", () => {
  beforeEach(() => {
    usePlaybackQueue.setState({ items: [], currentIndex: 0 });
  });

  it("adds and removes queue items", () => {
    usePlaybackQueue.getState().addToQueue([track("1")]);
    expect(usePlaybackQueue.getState().items).toHaveLength(1);
    usePlaybackQueue.getState().removeAt(0);
    expect(usePlaybackQueue.getState().items).toHaveLength(0);
  });

  it("reorders items", () => {
    usePlaybackQueue.getState().addToQueue([track("1"), track("2")]);
    usePlaybackQueue.getState().reorder(0, 1);
    expect(usePlaybackQueue.getState().items[0].track.id).toBe("2");
  });

  it("navigates next and previous", () => {
    usePlaybackQueue.getState().addToQueue([track("1"), track("2")]);
    usePlaybackQueue.getState().next();
    expect(usePlaybackQueue.getState().currentIndex).toBe(1);
    usePlaybackQueue.getState().previous();
    expect(usePlaybackQueue.getState().currentIndex).toBe(0);
  });

  it("play now replaces queue", () => {
    usePlaybackQueue.getState().addAutoTracks([track("auto")]);
    usePlaybackQueue.getState().playNow([track("now")]);
    expect(usePlaybackQueue.getState().items[0].track.id).toBe("now");
    expect(usePlaybackQueue.getState().items.every((i) => i.source === "user")).toBe(true);
  });

  it("tracks skipped indices", () => {
    usePlaybackQueue.getState().markSkipped(2);
    expect(usePlaybackQueue.getState().skippedIndices.has(2)).toBe(true);
    usePlaybackQueue.getState().resetSkipped();
    expect(usePlaybackQueue.getState().skippedIndices.size).toBe(0);
  });

  it("sets current index directly", () => {
    usePlaybackQueue.getState().addToQueue([track("1"), track("2"), track("3")]);
    usePlaybackQueue.getState().setIndex(2);
    expect(usePlaybackQueue.getState().currentIndex).toBe(2);
  });

  it("clears auto items", () => {
    usePlaybackQueue.setState({
      items: [
        { track: track("1"), source: "user" },
        { track: track("2"), source: "auto" },
      ],
      currentIndex: 0,
    });
    usePlaybackQueue.getState().clearAutoItems();
    expect(usePlaybackQueue.getState().items).toHaveLength(1);
  });
});
