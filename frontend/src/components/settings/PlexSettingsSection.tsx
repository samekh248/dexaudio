import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaskedSecretInput } from "./MaskedSecretInput";
import { setItem, StorageKeys } from "@/lib/local-storage";

export function PlexSettingsSection() {
  const { data: connection, refetch } = useQuery({
    queryKey: ["plex-connection"],
    queryFn: () => api.getPlexConnection(),
  });
  const [serverUrl, setServerUrl] = useState(connection?.serverUrl ?? "");
  const [token, setToken] = useState("");
  const [libraryIds, setLibraryIds] = useState<string[]>(connection?.libraryIds ?? []);

  const { data: libraries } = useQuery({
    queryKey: ["plex-libraries"],
    queryFn: () => api.getLibraries(),
    enabled: connection?.connected,
  });

  const save = useMutation({
    mutationFn: () => api.savePlexConnection({ serverUrl, token: token || "unchanged", libraryIds }),
    onSuccess: () => {
      if (libraryIds[0]) setItem(StorageKeys.activeLibraryId, libraryIds[0]);
      refetch();
    },
  });

  return (
    <section className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        {connection?.connected ? `Connected to ${connection.serverUrl}` : "Not connected"}
      </p>
      <div className="space-y-2">
        <Label>Server URL</Label>
        <Input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
      </div>
      <MaskedSecretInput
        id="plex-token"
        label="Token"
        value={token}
        onChange={setToken}
        placeholder={connection?.tokenMasked ?? "Plex token"}
      />
      {libraries?.map((lib) => (
        <label key={lib.id} className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={libraryIds.includes(lib.id)}
            onChange={(e) =>
              setLibraryIds((ids) =>
                e.target.checked ? [...ids, lib.id] : ids.filter((id) => id !== lib.id),
              )
            }
          />
          {lib.title}
        </label>
      ))}
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        Save Plex settings
      </Button>
    </section>
  );
}
