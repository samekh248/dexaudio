import type { QueueItem } from "@/stores/playback-queue-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackArtSrc } from "@/lib/track-art";
import { X } from "lucide-react";

interface QueuePanelProps {
  items: QueueItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
  className?: string;
}

function QueueTrackArt({ track }: { track: QueueItem["track"] }) {
  const artSrc = trackArtSrc(track);

  return (
    <div
      className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted"
      aria-hidden
    >
      {artSrc ? (
        <img
          src={artSrc}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}

export function QueuePanel({ items, currentIndex, onSelect, onRemove, className }: QueuePanelProps) {
  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <h2 className="shrink-0 text-sm font-semibold">Queue</h2>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-border bg-card p-2">
        {items.map((item, index) => (
          <li
            key={`${item.track.id}-${index}`}
            className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${
              index === currentIndex ? "border-primary bg-accent/30" : "border-border"
            }`}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => onSelect(index)}
            >
              <QueueTrackArt track={item.track} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.track.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.track.artist}</span>
                {item.source === "auto" && (
                  <span className="text-xs text-muted-foreground">Auto-queued</span>
                )}
              </span>
            </button>
            <Button variant="ghost" size="icon" onClick={() => onRemove(index)} aria-label="Remove">
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
