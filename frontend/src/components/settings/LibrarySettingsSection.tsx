import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";

export function LibrarySettingsSection() {
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
      </div>
    </section>
  );
}
