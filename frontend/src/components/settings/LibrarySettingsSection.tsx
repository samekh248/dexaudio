import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import { getItem, StorageKeys } from "@/lib/local-storage";

export function LibrarySettingsSection() {
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery({ queryKey: ["settings"], queryFn: () => api.getSettings() });
  const patch = useMutation({
    mutationFn: (policy: "manual" | "on_launch") =>
      api.patchSettings({ libraryRefreshPolicy: policy }),
    onSuccess: () => refetch(),
  });

  return (
    <section className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Refresh policy: {data?.libraryRefreshPolicy ?? "on_launch"}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => patch.mutate("manual")}>
          Manual refresh
        </Button>
        <Button variant="outline" onClick={() => patch.mutate("on_launch")}>
          Refresh on launch
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const libraryId = getItem(StorageKeys.activeLibraryId, "");
            if (libraryId) {
              void queryClient.invalidateQueries({ queryKey: ["albums", libraryId] });
            }
            void queryClient.invalidateQueries({ queryKey: ["top-stats"] });
          }}
        >
          Refresh library now
        </Button>
      </div>
    </section>
  );
}
