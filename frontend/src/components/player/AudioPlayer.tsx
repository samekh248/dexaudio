import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { AudioQuality, TrackFormat } from "@dexaudio/shared-types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { VolumeControl } from "@/components/player/VolumeControl";

interface AudioPlayerProps {
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  trackFormat?: TrackFormat;
  fromCache?: boolean;
  playbackQuality?: AudioQuality | null;
  loading?: boolean;
  status?: "idle" | "loading" | "ready" | "playing" | "paused" | "buffering" | "recovering" | "ended" | "failed";
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

function playbackStatusMessage(
  loading: boolean | undefined,
  status: AudioPlayerProps["status"],
  playing: boolean,
): string | null {
  if (status === "recovering") return "Recovering…";
  if (status === "buffering" && !playing) return "Buffering…";
  if (loading && !playing) return "Loading…";
  return null;
}

export function AudioPlayer({
  playing,
  position,
  duration,
  volume,
  trackFormat,
  fromCache,
  playbackQuality,
  loading,
  status,
  onPlay,
  onPause,
  onSeek,
  onVolume,
  onNext,
  onPrevious,
}: AudioPlayerProps) {
  const statusMessage = playbackStatusMessage(loading, status, playing);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {trackFormat && (
          <span aria-label={`File format: ${trackFormat}`}>{trackFormat.toUpperCase()}</span>
        )}
        {fromCache !== undefined && (
          <span>{fromCache ? "Cached" : "Streaming"}</span>
        )}
        {playbackQuality && (
          <span aria-label={`Audio quality: ${playbackQuality}`}>
            {playbackQuality === "lossless" ? "Lossless" : "Transcoded"}
          </span>
        )}
      </div>
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
      {statusMessage ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
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
        <VolumeControl volume={volume} onVolume={onVolume} iconClassName="h-5 w-5" />
      </div>
    </div>
  );
}
