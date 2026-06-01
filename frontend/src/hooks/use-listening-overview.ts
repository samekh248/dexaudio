import { useQuery } from "@tanstack/react-query";
import type { StatsPeriod } from "@dexaudio/shared-types";
import { api } from "@/services/api-client";

export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function useListeningOverview(period: StatsPeriod) {
  const tz = viewerTimeZone();
  return useQuery({
    queryKey: ["stats-overview", period, tz],
    queryFn: () => api.getStatsOverview(period, tz),
  });
}
