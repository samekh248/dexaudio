import { useQuery } from "@tanstack/react-query";
import type { StatsPeriod } from "@dexaudio/shared-types";
import { api } from "@/services/api-client";
import { viewerTimeZone } from "@/hooks/use-listening-overview";

export function useListeningPatterns(period: StatsPeriod, enabled = true) {
  const tz = viewerTimeZone();
  return useQuery({
    queryKey: ["stats-patterns", period, tz],
    queryFn: () => api.getStatsPatterns(period, tz),
    enabled,
  });
}
