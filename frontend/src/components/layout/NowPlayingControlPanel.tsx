import type { ReactNode } from "react";
import type { Track } from "@dexaudio/shared-types";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackMarquee } from "@/components/player/TrackMarquee";
import { VolumeControl } from "@/components/player/VolumeControl";
import { cn } from "@/lib/utils";
import { trackArtSrc } from "@/lib/track-art";
import { PlaybackOutputCastButton } from "@/components/playback/PlaybackOutputSelector";

export interface NowPlayingControlPanelProps {
  open: boolean;
  current: Track;
  playing: boolean;
  volume: number;
  onVolume: (v: number) => void;
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

function marqueeText(track: Track): string {
  return [track.artist, track.title].filter(Boolean).join(" - ");
}

function PanelArtBackground({ artSrc }: { artSrc: string | undefined }) {
  if (!artSrc) {
    return <div className="absolute inset-0 bg-card" aria-hidden />;
  }

  return (
    <>
      <div className="absolute inset-0 bg-card" aria-hidden />
      <img
        src={artSrc}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-md"
        data-testid="panel-art-background"
      />
    </>
  );
}

function PanelTrackArt({ artSrc }: { artSrc: string | undefined }) {
  return (
    <div
      className="row-span-2 h-0 min-h-full justify-self-start self-stretch overflow-hidden"
      data-testid="panel-track-art"
    >
      <div
        className="aspect-square h-full overflow-hidden rounded bg-muted/80 ring-1 ring-white/10"
        aria-hidden
      >
        {artSrc ? (
          <img src={artSrc} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
    </div>
  );
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
  volume,
  onVolume,
  onToggle,
  onNext,
  onPrevious,
}: NowPlayingControlPanelProps) {
  if (!open) return null;

  const text = marqueeText(current);
  const artSrc = trackArtSrc(current);

  return (
    <div
      role="region"
      aria-label="Playback controls"
      className={cn(
        "absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-md border border-border px-3 pt-3 pb-8 shadow-lg",
        "pointer-events-auto",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <PanelArtBackground artSrc={artSrc} />
      <div className="relative z-10 grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-3 gap-y-3">
        <PanelTrackArt artSrc={artSrc} />
        <TrackMarquee text={text} className="col-start-2 text-sm text-foreground" />
        <div className="col-start-2 flex items-center justify-start gap-1">
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
          <VolumeControl
            volume={volume}
            onVolume={onVolume}
            forceClosed={!open}
          />
        </div>
      </div>
      <PlaybackOutputCastButton className="absolute bottom-2 right-2 z-20" />
    </div>
  );
}
