import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QueuePanel } from "@/components/queue/QueuePanel";
import type { QueueItem } from "@/stores/playback-queue-store";
import type { Track } from "@dexaudio/shared-types";

const track = (id: string, albumId?: string): Track => ({
  id,
  title: `Track ${id}`,
  artist: "Artist",
  album: "Album",
  albumId,
  durationMs: 180000,
  format: "mp3",
});

describe("QueuePanel", () => {
  afterEach(() => cleanup());

  it("renders album art to the left of each queue row", () => {
    const items: QueueItem[] = [{ track: track("1", "album-1"), source: "user" }];
    render(
      <QueuePanel
        items={items}
        currentIndex={0}
        playbackStarted
        onSelect={() => {}}
        onRemove={() => {}}
      />,
    );

    const img = screen.getByRole("presentation", { hidden: true });
    expect(img).toHaveAttribute(
      "src",
      "/api/v1/plex/photo?path=%2Flibrary%2Fmetadata%2Falbum-1%2Fthumb",
    );
  });

  it("shows section headers and at most three played rows", () => {
    const items: QueueItem[] = ["1", "2", "3", "4", "5"].map((id) => ({
      track: track(id),
      source: "user" as const,
    }));
    render(
      <QueuePanel
        items={items}
        currentIndex={4}
        playbackStarted
        onSelect={() => {}}
        onRemove={() => {}}
      />,
    );

    expect(screen.getByLabelText("Played")).toBeInTheDocument();
    expect(screen.getByLabelText("Now playing")).toBeInTheDocument();

    const playedRegion = screen.getByLabelText("Played");
    expect(within(playedRegion).getByText("Track 2")).toBeInTheDocument();
    expect(within(playedRegion).getByText("Track 3")).toBeInTheDocument();
    expect(within(playedRegion).getByText("Track 4")).toBeInTheDocument();
    expect(within(playedRegion).queryByText("Track 1")).not.toBeInTheDocument();

    const nowPlayingRegion = screen.getByLabelText("Now playing");
    expect(within(nowPlayingRegion).getByText("Track 5")).toBeInTheDocument();
  });
});
