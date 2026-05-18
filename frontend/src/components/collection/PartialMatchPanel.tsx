import type { MatchCandidate } from "@dexaudio/shared-types";
import { Button } from "@/components/ui/button";

interface PartialMatchPanelProps {
  releaseId: number;
  candidates: MatchCandidate[];
  onConfirm: (plexAlbumId: string) => void;
  onReject: () => void;
}

export function PartialMatchPanel({
  releaseId,
  candidates,
  onConfirm,
  onReject,
}: PartialMatchPanelProps) {
  if (candidates.length === 0) return null;

  return (
    <div className="mt-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
      <p className="mb-2 font-medium">Partial match — pick a Plex album</p>
      <ul className="space-y-2">
        {candidates.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2">
            <span>
              {c.title} <span className="text-muted-foreground">· {c.artist}</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => onConfirm(c.id)}>
              Confirm
            </Button>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        variant="ghost"
        className="mt-2"
        onClick={onReject}
        aria-label={`Mark release ${releaseId} as not on Plex`}
      >
        Not on Plex
      </Button>
    </div>
  );
}
