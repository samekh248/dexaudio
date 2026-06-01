import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api-client";

export function useLastfmSync(pollWhileSyncing = true) {
  const queryClient = useQueryClient();
  const prevStatus = useRef<string | undefined>(undefined);
  const query = useQuery({
    queryKey: ["lastfm-sync-status"],
    queryFn: () => api.getLastfmSyncStatus(),
    refetchInterval: (q) => {
      if (!pollWhileSyncing) return false;
      const status = q.state.data?.status;
      return status === "syncing" || status === "error" ? 3000 : false;
    },
  });

  useEffect(() => {
    const next = query.data?.status;
    if (prevStatus.current === "syncing" && next === "idle") {
      void queryClient.invalidateQueries({ queryKey: ["stats-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["stats-patterns"] });
    }
    prevStatus.current = next;
  }, [query.data?.status, queryClient]);

  return query;
}
