import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api-client";
import type { MatchStatus } from "@dexaudio/shared-types";
import { CollectionFilters } from "@/components/collection/CollectionFilters";
import { CollectionRow } from "@/components/collection/CollectionRow";
import { Button } from "@/components/ui/button";

export function CollectionPage() {
  const [status, setStatus] = useState<MatchStatus | undefined>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["discogs-collection", status],
    queryFn: () => api.getDiscogsCollection(status),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discogs collection</h1>
        <Button onClick={() => api.syncDiscogs().then(() => refetch())}>Sync</Button>
      </div>
      <CollectionFilters status={status} onChange={setStatus} />
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <ul className="divide-y divide-border">
          {data?.map((item) => (
            <CollectionRow key={item.releaseId} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
