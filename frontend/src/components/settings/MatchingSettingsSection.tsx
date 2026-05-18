import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import { Button } from "@/components/ui/button";

export function MatchingSettingsSection() {
  const { data, refetch } = useQuery({ queryKey: ["settings"], queryFn: () => api.getSettings() });
  const patch = useMutation({
    mutationFn: (strictness: "strict" | "fuzzy") => api.patchSettings({ matchingStrictness: strictness }),
    onSuccess: () => refetch(),
  });

  return (
    <section className="space-y-4 max-w-lg">
      <p className="text-sm">Current: {data?.matchingStrictness ?? "fuzzy"}</p>
      <div className="flex gap-2">
        <Button variant={data?.matchingStrictness === "strict" ? "default" : "outline"} onClick={() => patch.mutate("strict")}>
          Strict
        </Button>
        <Button variant={data?.matchingStrictness === "fuzzy" ? "default" : "outline"} onClick={() => patch.mutate("fuzzy")}>
          Fuzzy
        </Button>
      </div>
    </section>
  );
}
