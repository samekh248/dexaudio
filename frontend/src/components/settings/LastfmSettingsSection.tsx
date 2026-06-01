import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LastfmSyncProgress } from "@/components/stats/LastfmSyncProgress";
import { api, ApiError } from "@/services/api-client";
import { useLastfmSync } from "@/hooks/use-lastfm-sync";

type AuthPhase = "idle" | "awaiting" | "error";

const POLL_INTERVAL_MS = 3000;

export function LastfmSettingsSection() {
  const queryClient = useQueryClient();
  const { data: syncStatus } = useLastfmSync();
  const [phase, setPhase] = useState<AuthPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    [],
  );

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const pollUntilAuthorized = (token: string) => {
    const tick = async () => {
      try {
        const status = await api.getLastfmAuthStatus(token);
        if (status.authorized) {
          stopPolling();
          setPhase("idle");
          setError(null);
          void queryClient.invalidateQueries({ queryKey: ["lastfm-sync-status"] });
          void queryClient.invalidateQueries({ queryKey: ["stats-overview"] });
          void queryClient.invalidateQueries({ queryKey: ["stats-patterns"] });
          return;
        }
        if (status.expired) {
          stopPolling();
          setPhase("error");
          setError("Authorization expired before it was approved. Please try again.");
          return;
        }
        pollTimer.current = setTimeout(() => void tick(), POLL_INTERVAL_MS);
      } catch (err) {
        stopPolling();
        setPhase("error");
        setError(err instanceof ApiError ? err.message : "Could not verify Last.fm authorization.");
      }
    };
    pollTimer.current = setTimeout(() => void tick(), POLL_INTERVAL_MS);
  };

  const handleConnect = async () => {
    setError(null);
    try {
      const { token, authUrl } = await api.startLastfmAuth();
      window.open(authUrl, "_blank", "noopener,noreferrer");
      setPhase("awaiting");
      pollUntilAuthorized(token);
    } catch (err) {
      setPhase("error");
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not start Last.fm authorization. Check the server configuration.",
      );
    }
  };

  const handleDisconnect = async () => {
    stopPolling();
    setPhase("idle");
    setError(null);
    await api.disconnectLastfm();
    void queryClient.invalidateQueries({ queryKey: ["lastfm-sync-status"] });
    void queryClient.invalidateQueries({ queryKey: ["stats-overview"] });
  };

  const isConnected = Boolean(syncStatus?.connected && syncStatus.username);

  return (
    <section className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <h2 className="font-semibold">Last.fm account</h2>
        <p className="text-sm text-muted-foreground">
          Sign in with Last.fm to import your scrobble history and enable scrobbling. A full history
          backfill starts automatically once connected; incremental syncs run on a schedule.
        </p>
      </div>

      {isConnected ? (
        <div className="space-y-2 rounded-lg border border-border p-4">
          <p className="text-sm">
            Connected as <span className="font-medium">{syncStatus?.username}</span>
          </p>
          {syncStatus?.lastSyncedAt && (
            <p className="text-xs text-muted-foreground">
              Last synced {new Date(syncStatus.lastSyncedAt).toLocaleString()}
            </p>
          )}
          {syncStatus?.status === "syncing" && syncStatus && (
            <LastfmSyncProgress status={syncStatus} />
          )}
          {syncStatus?.status === "error" && syncStatus.lastError && (
            <p className="text-xs text-destructive">{syncStatus.lastError}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Not connected.</p>
      )}

      {phase === "awaiting" && (
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          Waiting for you to approve access on Last.fm… Approve in the opened tab, then return here.
        </p>
      )}
      {phase === "error" && error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleConnect} disabled={phase === "awaiting"}>
          {phase === "awaiting"
            ? "Waiting for approval…"
            : isConnected
              ? "Reconnect with Last.fm"
              : "Connect with Last.fm"}
        </Button>
        {isConnected && (
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect
          </Button>
        )}
        <Button variant="outline" onClick={() => api.retryScrobbles()}>
          Retry pending scrobbles
        </Button>
      </div>
    </section>
  );
}
