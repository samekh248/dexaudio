import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { QueueItem } from "@/stores/playback-queue-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackArtSrc } from "@/lib/track-art";
import { buildQueueDisplaySections } from "@/lib/queue-display";
import { useTrackPrep, type TrackPrepState } from "@/lib/queue-prep-store";
import { X } from "lucide-react";

interface QueuePanelProps {
  items: QueueItem[];
  currentIndex: number;
  playbackStarted: boolean;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onReorderUpcoming?: (from: number, to: number) => void;
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

function PrepBufferBar({ prep, show }: { prep: TrackPrepState; show: boolean }) {
  if (!show || prep.status === "idle") return null;

  const value =
    prep.status === "ready"
      ? 100
      : prep.progressRatio != null
        ? Math.round(prep.progressRatio * 100)
        : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label="Track preparation progress"
      className={cn(
        "mt-1 h-0.5 w-full overflow-hidden rounded-full bg-muted",
        prep.status === "error" && "bg-destructive/30",
      )}
    >
      <div
        className={cn(
          "h-full bg-primary transition-[width] duration-150",
          prep.status === "error" && "bg-destructive",
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

type RowKind = "played" | "current" | "upcoming";

function QueueSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={cn("space-y-1.5", className)}>
      <h3 className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-1">{children}</ul>
    </section>
  );
}

function QueueRow({
  item,
  index,
  kind,
  currentIndex,
  isNextTrack,
  dragIndex,
  onSelect,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onKeyReorder,
  onTouchDragStart,
}: {
  item: QueueItem;
  index: number;
  kind: RowKind;
  currentIndex: number;
  isNextTrack: boolean;
  dragIndex: number | null;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onKeyReorder: (index: number, direction: "up" | "down") => void;
  onTouchDragStart: (index: number) => void;
}) {
  const prep = useTrackPrep(item.track.id);
  const draggable = kind === "upcoming";
  const showRemove = kind === "current" || kind === "upcoming";
  const showPrep = kind === "upcoming" && (isNextTrack || prep.status !== "idle");

  const handleKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    if (!draggable || !e.altKey) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onKeyReorder(index, "up");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onKeyReorder(index, "down");
    }
  };

  return (
    <li
      draggable={draggable}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      onPointerDown={() => {
        if (!draggable) return;
        onTouchDragStart(index);
      }}
      onKeyDown={handleKeyDown}
      style={draggable ? { touchAction: "none" } : undefined}
      className={cn(
        "relative flex flex-col rounded-md border px-2 py-1.5 text-sm transition-colors duration-150",
        kind === "current" &&
          "border-primary bg-accent/30 hover:bg-accent/45 focus-within:bg-accent/45",
        kind === "played" &&
          "border-border opacity-60 hover:bg-muted/35 hover:opacity-80 focus-within:bg-muted/35 focus-within:opacity-80",
        kind === "upcoming" &&
          "border-border hover:bg-muted/40 focus-within:bg-muted/40",
        draggable && "cursor-grab active:cursor-grabbing",
        dragIndex === index && "ring-1 ring-primary",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
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
        {showRemove ? (
          <Button variant="ghost" size="icon" onClick={() => onRemove(index)} aria-label="Remove">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <PrepBufferBar prep={prep} show={showPrep} />
    </li>
  );
}

export function QueuePanel({
  items,
  currentIndex,
  playbackStarted,
  onSelect,
  onRemove,
  onReorderUpcoming,
  className,
}: QueuePanelProps) {
  const sections = useMemo(
    () => buildQueueDisplaySections({ items, currentIndex, playbackStarted }),
    [items, currentIndex, playbackStarted],
  );

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const touchDragIndex = useRef<number | null>(null);

  const nextIndex = sections.current ? sections.current.index + 1 : -1;

  const handleDragStart = useCallback((index: number) => {
    if (index <= currentIndex) return;
    setDragFrom(index);
  }, [currentIndex]);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      if (dragFrom === null || index <= currentIndex) return;
      e.preventDefault();
    },
    [dragFrom, currentIndex],
  );

  const handleDrop = useCallback(
    (toIndex: number) => {
      if (dragFrom === null || !onReorderUpcoming) return;
      if (toIndex <= currentIndex || dragFrom <= currentIndex) {
        setDragFrom(null);
        return;
      }
      if (dragFrom !== toIndex) {
        onReorderUpcoming(dragFrom, toIndex);
        setLiveMessage("Queue order updated");
      }
      setDragFrom(null);
    },
    [dragFrom, currentIndex, onReorderUpcoming],
  );

  const handleTouchDragStart = useCallback(
    (index: number) => {
      if (index <= currentIndex) return;
      touchDragIndex.current = index;
      const timer = setTimeout(() => {
        if (touchDragIndex.current === index) {
          setDragFrom(index);
          setLiveMessage("Drag to reorder");
        }
      }, 400);
      const clear = () => {
        clearTimeout(timer);
        touchDragIndex.current = null;
        window.removeEventListener("pointerup", clear);
        window.removeEventListener("pointercancel", clear);
      };
      window.addEventListener("pointerup", clear);
      window.addEventListener("pointercancel", clear);
    },
    [currentIndex],
  );

  const handleKeyReorder = useCallback(
    (index: number, direction: "up" | "down") => {
      if (!onReorderUpcoming) return;
      const to = direction === "up" ? index - 1 : index + 1;
      if (to <= currentIndex || to >= items.length) return;
      onReorderUpcoming(index, to);
      setLiveMessage("Queue order updated");
    },
    [currentIndex, items.length, onReorderUpcoming],
  );

  const rowProps = {
    currentIndex,
    dragIndex: dragFrom,
    onSelect,
    onRemove,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    onKeyReorder: handleKeyReorder,
    onTouchDragStart: handleTouchDragStart,
  };

  const upcomingTitle = sections.current ? "Up next" : "In queue";

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <h2 className="shrink-0 text-sm font-semibold">Queue</h2>
      <div
        className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card p-3"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage ? <span className="sr-only">{liveMessage}</span> : null}
        <div className="space-y-5">
          {sections.played.length > 0 ? (
            <QueueSection title="Played">
              {sections.played.map((row) => (
                <QueueRow
                  key={`played-${row.item.track.id}-${row.index}`}
                  item={row.item}
                  index={row.index}
                  kind="played"
                  isNextTrack={false}
                  {...rowProps}
                />
              ))}
            </QueueSection>
          ) : null}

          {sections.current ? (
            <QueueSection title="Now playing">
              <QueueRow
                key={`current-${sections.current.item.track.id}-${sections.current.index}`}
                item={sections.current.item}
                index={sections.current.index}
                kind="current"
                isNextTrack={false}
                {...rowProps}
              />
            </QueueSection>
          ) : null}

          {sections.upcoming.length > 0 ? (
            <QueueSection title={upcomingTitle}>
              {sections.upcoming.map((row) => (
                <QueueRow
                  key={`upcoming-${row.item.track.id}-${row.index}`}
                  item={row.item}
                  index={row.index}
                  kind="upcoming"
                  isNextTrack={row.index === nextIndex}
                  {...rowProps}
                />
              ))}
            </QueueSection>
          ) : null}
        </div>
      </div>
    </div>
  );
}
