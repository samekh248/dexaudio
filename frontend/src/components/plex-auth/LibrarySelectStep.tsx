import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";

interface LibrarySelectStepProps {
  machineId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function LibrarySelectStep({ machineId, selectedIds, onChange }: LibrarySelectStepProps) {
  const { data: libraries, isLoading, error, refetch } = useQuery({
    queryKey: ["plex-auth-libraries", machineId],
    queryFn: () => api.getPlexAuthServerLibraries(machineId),
    enabled: Boolean(machineId),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading music libraries…</p>;
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

  if (!libraries?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No music libraries on this server. Go back and choose another server.
      </p>
    );
  }

  return (
    <ul className="max-h-64 space-y-2 overflow-y-auto">
      {libraries.map((lib) => (
        <li key={lib.id}>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm">
            <input
              type="checkbox"
              checked={selectedIds.includes(lib.id)}
              onChange={(e) => {
                onChange(
                  e.target.checked
                    ? [...selectedIds, lib.id]
                    : selectedIds.filter((id) => id !== lib.id),
                );
              }}
            />
            {lib.title}
          </label>
        </li>
      ))}
    </ul>
  );
}
