import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import type { PlexServerInfo } from "@dexaudio/shared-types";

interface ServerSelectStepProps {
  selectedId: string | null;
  onSelect: (server: PlexServerInfo) => void;
}

export function ServerSelectStep({ selectedId, onSelect }: ServerSelectStepProps) {
  const { data: servers, isLoading, error, refetch } = useQuery({
    queryKey: ["plex-auth-servers"],
    queryFn: () => api.getPlexAuthServers(),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading servers…</p>;
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-500">{(error as Error).message}</p>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!servers?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No Plex servers were found on this account. Ensure Plex Media Server is running and claimed.
      </p>
    );
  }

  return (
    <ul className="max-h-64 space-y-2 overflow-y-auto" role="radiogroup" aria-label="Plex servers">
      {servers.map((server) => {
        const disabled = !server.online;
        return (
          <li key={server.machineIdentifier}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                selectedId === server.machineIdentifier ? "border-primary bg-accent/50" : "border-border"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="plex-server"
                className="mt-1"
                disabled={disabled}
                checked={selectedId === server.machineIdentifier}
                onChange={() => onSelect(server)}
              />
              <span>
                <span className="font-medium">{server.name}</span>
                <span className="mt-0.5 block text-muted-foreground">
                  {server.owned ? "Owned" : `Shared${server.sourceTitle ? ` · ${server.sourceTitle}` : ""}`}
                  {!server.online && " · Offline"}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
