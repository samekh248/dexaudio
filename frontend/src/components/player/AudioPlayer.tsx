import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  fromCache?: boolean;
  loading?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ms: number) => void;
  onVolume: (v: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioPlayer({
  playing,
  position,
  duration,
  volume,
  fromCache,
  loading,
  onPlay,
  onPause,
  onSeek,
  onVolume,
  onNext,
  onPrevious,
}: AudioPlayerProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {fromCache !== undefined && (
        <span className="text-xs text-muted-foreground">{fromCache ? "Cached" : "Streaming"}</span>
      )}
      <Slider
        value={[position]}
        max={duration || 1}
        step={1000}
        onValueChange={([v]) => onSeek(v)}
        aria-label="Seek"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span aria-live="polite">{formatMs(position)}</span>
        <span>{formatMs(duration)}</span>
      </div>
      {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" onClick={onPrevious} aria-label="Previous">
          <SkipBack className="h-5 w-5" />
        </Button>
        <Button size="icon" onClick={playing ? onPause : onPlay} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next">
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>
      <Slider value={[volume * 100]} max={100} step={1} onValueChange={([v]) => onVolume(v / 100)} aria-label="Volume" />
    </div>
  );
}
