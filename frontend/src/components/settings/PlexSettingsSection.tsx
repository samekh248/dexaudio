import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import { PlexAuthModal } from "@/components/plex-auth/PlexAuthModal";

export function PlexSettingsSection() {
  const { data: connection, refetch } = useQuery({
    queryKey: ["plex-connection"],
    queryFn: () => api.getPlexConnection(),
  });
  const [modalOpen, setModalOpen] = useState(false);

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
      <PlexAuthModal
        open={modalOpen}
        mode="settings"
        onOpenChange={setModalOpen}
        onComplete={() => refetch()}
      />
    </section>
  );
}
