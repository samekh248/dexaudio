import type { LastfmSyncStatus } from "@dexaudio/shared-types";
import { Progress } from "@/components/ui/progress";

interface LastfmSyncProgressProps {
  status: LastfmSyncStatus;
  className?: string;
}

export function lastfmPageProgress(status: LastfmSyncStatus): {
  value: number;
  max: number;
  label: string;
} | null {
  if (status.status !== "syncing" || status.totalPages == null || status.totalPages <= 0) {
    return null;
  }
  return {
    value: status.syncedPages,
    max: status.totalPages,
    label: `Page ${status.syncedPages} of ${status.totalPages}`,
  };
}

export function LastfmSyncProgress({ status, className }: LastfmSyncProgressProps) {
  if (status.status !== "syncing") return null;

  const pageProgress = lastfmPageProgress(status);

  return (
    <div className={className}>
      <Progress
        value={pageProgress?.value ?? 0}
        max={pageProgress?.max ?? 100}
        indeterminate={pageProgress == null}
        aria-label={pageProgress?.label ?? "Syncing Last.fm history"}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        {pageProgress?.label ?? "Starting sync…"}
      </p>
    </div>
  );
}
