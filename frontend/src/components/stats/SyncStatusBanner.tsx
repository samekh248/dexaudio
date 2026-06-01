import type { LastfmSyncStatus } from "@dexaudio/shared-types";
import { LastfmSyncProgress } from "@/components/stats/LastfmSyncProgress";

interface SyncStatusBannerProps {
  status: LastfmSyncStatus;
}

export function SyncStatusBanner({ status }: SyncStatusBannerProps) {
  if (!status.connected || !status.username) return null;

  return (
    <div
      className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <p>
        <span className="font-medium">Last.fm sync</span>
        {" — "}
        {status.status === "syncing" && "Syncing history…"}
        {status.status === "idle" && "Up to date"}
        {status.status === "error" && "Sync error"}
      </p>
      {status.status === "syncing" && <LastfmSyncProgress status={status} className="mt-3" />}
      {status.lastSyncedAt && status.status !== "syncing" && (
        <p className="mt-2 text-muted-foreground">
          Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
        </p>
      )}
      {status.lastError && status.status === "error" && (
        <p className="mt-2 text-destructive">
          {status.lastError}
          {" "}
          Retrying automatically…
        </p>
      )}
    </div>
  );
}
