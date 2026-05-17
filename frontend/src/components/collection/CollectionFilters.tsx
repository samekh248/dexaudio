import type { MatchStatus } from "@dexaudio/shared-types";
import { Button } from "@/components/ui/button";

const filters: Array<{ label: string; value?: MatchStatus }> = [
  { label: "All" },
  { label: "Matched", value: "matched" },
  { label: "Partial", value: "partial" },
  { label: "Not on Plex", value: "not_on_plex" },
];

interface CollectionFiltersProps {
  status?: MatchStatus;
  onChange: (status?: MatchStatus) => void;
}

export function CollectionFilters({ status, onChange }: CollectionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <Button
          key={f.label}
          size="sm"
          variant={status === f.value ? "default" : "outline"}
          onClick={() => onChange(f.value)}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
