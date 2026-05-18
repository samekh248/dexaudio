import type { Track } from "@dexaudio/shared-types";
import { Button } from "@/components/ui/button";

interface TrackRowProps {
  track: Track;
  onPlayNow: () => void;
  onAddToQueue: () => void;
}

export function TrackRow({ track, onPlayNow, onAddToQueue }: TrackRowProps) {
  const unsupported = track.format === "unsupported";

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-2">
      <div>
        <p className="font-medium">{track.title}</p>
        <p className="text-xs text-muted-foreground">
          {track.format.toUpperCase()}
          {unsupported && (
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
              Unsupported
            </span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={unsupported} onClick={onPlayNow}>
          Play now
        </Button>
        <Button size="sm" variant="outline" disabled={unsupported} onClick={onAddToQueue}>
          Add to queue
        </Button>
      </div>
    </div>
  );
}
