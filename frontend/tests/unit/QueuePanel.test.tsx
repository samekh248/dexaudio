import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
  it("renders album art to the left of each queue row", () => {
    const items: QueueItem[] = [{ track: track("1", "album-1"), source: "user" }];
    render(
      <QueuePanel items={items} currentIndex={0} onSelect={() => {}} onRemove={() => {}} />,
    );

    const img = screen.getByRole("presentation", { hidden: true });
    expect(img).toHaveAttribute(
      "src",
      "/api/v1/plex/photo?path=%2Flibrary%2Fmetadata%2Falbum-1%2Fthumb",
    );
  });
});
