import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setItem, StorageKeys } from "@/lib/local-storage";

export function PlexSetupPage() {
  const navigate = useNavigate();
  const [serverUrl, setServerUrl] = useState("");
  const [token, setToken] = useState("");
  const [libraryIds, setLibraryIds] = useState<string[]>([]);

  const { data: libraries, refetch } = useQuery({
    queryKey: ["plex-libraries"],
    queryFn: () => api.getLibraries(),
    enabled: false,
  });

  const save = useMutation({
    mutationFn: () => api.savePlexConnection({ serverUrl, token, libraryIds }),
    onSuccess: () => {
      if (libraryIds[0]) setItem(StorageKeys.activeLibraryId, libraryIds[0]);
      navigate("/");
    },
  });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Connect Plex</h1>
      <div className="space-y-2">
        <Label htmlFor="url">Server URL</Label>
        <Input id="url" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="https://plex.example.com:32400" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="token">Token</Label>
        <Input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          await api.savePlexConnection({ serverUrl, token });
          refetch();
        }}
      >
        Validate & load libraries
      </Button>
      {libraries && libraries.length > 0 && (
        <div className="space-y-2">
          <Label>Music libraries</Label>
          {libraries.map((lib) => (
            <label key={lib.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={libraryIds.includes(lib.id)}
                onChange={(e) => {
                  setLibraryIds((ids) =>
                    e.target.checked ? [...ids, lib.id] : ids.filter((id) => id !== lib.id),
                  );
                }}
              />
              {lib.title}
            </label>
          ))}
        </div>
      )}
      <Button onClick={() => save.mutate()} disabled={save.isPending || !serverUrl || !token}>
        Save connection
      </Button>
      {save.isError && <p className="text-sm text-red-500">{(save.error as Error).message}</p>}
    </div>
  );
}
