import { useState } from "react";
import type { PlaybackAffordance, PlaybackFailure } from "@dexaudio/shared-types";
import { Button } from "@/components/ui/button";

const AFFORDANCE_LABELS: Record<PlaybackAffordance, string> = {
  skip: "Skip",
  retry: "Retry",
  sign_in: "Sign in",
  back_to_library: "Back to library",
  retry_queue: "Retry queue",
  play_gesture: "Play",
};

interface PlaybackErrorBannerProps {
  error: PlaybackFailure;
  onAffordance: (affordance: PlaybackAffordance) => void;
  onDismiss?: () => void;
}

export function PlaybackErrorBanner({ error, onAffordance, onDismiss }: PlaybackErrorBannerProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3 max-w-full"
    >
      <p className="font-medium text-sm">{error.message}</p>
      {(error.trackTitle || error.trackArtist) && (
        <p className="text-sm text-muted-foreground">
          {[error.trackTitle, error.trackArtist].filter(Boolean).join(" — ")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {error.affordances.map((a) => (
          <Button key={a} size="sm" variant="outline" onClick={() => onAffordance(a)}>
            {AFFORDANCE_LABELS[a]}
          </Button>
        ))}
        {onDismiss ? (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
      </div>
      {error.technicalDetail ? (
        <div>
          <Button
            type="button"
            variant="ghost"
            className="h-auto p-0 text-xs"
            onClick={() => setShowDetails((v) => !v)}
          >
            {showDetails ? "Hide details" : "See details"}
          </Button>
          {showDetails ? (
            <p className="text-xs text-muted-foreground mt-1 break-all">{error.technicalDetail}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
