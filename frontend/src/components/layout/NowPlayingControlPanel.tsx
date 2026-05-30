import type { ReactNode } from "react";
import type { Track } from "@dexaudio/shared-types";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackMarquee } from "@/components/player/TrackMarquee";
import { cn } from "@/lib/utils";

export interface NowPlayingControlPanelProps {
  open: boolean;
  current: Track;
  playing: boolean;
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

function marqueeText(track: Track): string {
  return [track.artist, track.title].filter(Boolean).join(" - ");
}

function ControlButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  pressed?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="group relative h-9 w-9 shrink-0"
      aria-label={label}
      aria-pressed={pressed}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
      <span
        className={cn(
          "pointer-events-none absolute -bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground",
          "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
        aria-hidden
      >
        {label}
      </span>
    </Button>
  );
}

export function NowPlayingControlPanel({
  open,
  current,
  playing,
  onToggle,
  onNext,
  onPrevious,
}: NowPlayingControlPanelProps) {
  if (!open) return null;

  const text = marqueeText(current);

  return (
    <div
      role="region"
      aria-label="Playback controls"
      className={cn(
        "absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-card p-3 shadow-lg",
        "pointer-events-auto",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <TrackMarquee text={text} className="mb-3 text-sm text-foreground" />
      <div className="flex items-center justify-center gap-1">
        <ControlButton label="Previous" onClick={onPrevious}>
          <SkipBack className="h-4 w-4" aria-hidden />
        </ControlButton>
        <ControlButton
          label={playing ? "Pause" : "Play"}
          onClick={onToggle}
          pressed={playing}
        >
          {playing ? (
            <Pause className="h-4 w-4" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
        </ControlButton>
        <ControlButton label="Next" onClick={onNext}>
          <SkipForward className="h-4 w-4" aria-hidden />
        </ControlButton>
      </div>
    </div>
  );
}
