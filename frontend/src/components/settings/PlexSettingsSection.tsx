import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlexAuthModal } from "@/components/plex-auth/PlexAuthModal";
import { setPlexReportingEnabled } from "@/lib/plex-playback-reporter.js";

export function PlexSettingsSection() {
  const queryClient = useQueryClient();
  const { data: connection, refetch } = useQuery({
    queryKey: ["plex-connection"],
    queryFn: () => api.getPlexConnection(),
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });
  const { data: reportingStatus } = useQuery({
    queryKey: ["plex-reporting-status"],
    queryFn: () => api.getPlexReportingStatus(),
    enabled: connection?.connected === true,
    staleTime: 60_000,
  });
  const [modalOpen, setModalOpen] = useState(false);

  const reportingEnabled = settings?.plexPlaybackReporting?.enabled !== false;

  const patchReporting = useMutation({
    mutationFn: (enabled: boolean) =>
      api.patchSettings({ plexPlaybackReporting: { enabled } }),
    onSuccess: (_data, enabled) => {
      setPlexReportingEnabled(enabled);
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      void queryClient.invalidateQueries({ queryKey: ["plex-reporting-status"] });
    },
  });

  const retryReporting = useMutation({
    mutationFn: () => api.retryPlexReporting(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plex-reporting-status"] });
    },
  });

  return (
    <section className="space-y-4 max-w-lg">
      {connection?.connected ? (
        <div className="flex items-center gap-3">
          {connection.account?.avatarUrl && (
            <img
              src={connection.account.avatarUrl}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          )}
          <div>
            <p className="font-medium">{connection.account?.username ?? "Plex account"}</p>
            <p className="text-sm text-muted-foreground">
              {connection.serverName ?? connection.serverUrl}
              {connection.libraryIds?.length
                ? ` · ${connection.libraryIds.length} librar${connection.libraryIds.length === 1 ? "y" : "ies"}`
                : ""}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Not connected to Plex</p>
      )}
      <Button type="button" variant="outline" onClick={() => setModalOpen(true)}>
        {connection?.connected ? "Re-authenticate" : "Sign in with Plex"}
      </Button>

      {connection?.connected ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="plex-playback-reporting">Report playback to Plex</Label>
              <p className="text-sm text-muted-foreground" id="plex-playback-reporting-desc">
                Updates Plex activity and play history for listening in this app (shown as DexAudio).
              </p>
            </div>
            <Switch
              id="plex-playback-reporting"
              aria-describedby="plex-playback-reporting-desc"
              checked={reportingEnabled}
              disabled={patchReporting.isPending}
              onCheckedChange={(checked) => patchReporting.mutate(checked)}
            />
          </div>
          {reportingEnabled && reportingStatus ? (
            <div className="text-sm text-muted-foreground space-y-2">
              {reportingStatus.pending > 0 ? (
                <p>
                  {reportingStatus.pending} report
                  {reportingStatus.pending === 1 ? "" : "s"} waiting to retry.
                </p>
              ) : (
                <p>Reporting to Plex is up to date.</p>
              )}
              {reportingStatus.lastError ? (
                <p className="text-destructive">Last error: {reportingStatus.lastError}</p>
              ) : null}
              {reportingStatus.pending > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={retryReporting.isPending}
                  onClick={() => retryReporting.mutate()}
                >
                  Retry reporting
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <PlexAuthModal
        open={modalOpen}
        mode="settings"
        onOpenChange={setModalOpen}
        onComplete={() => refetch()}
      />
    </section>
  );
}
