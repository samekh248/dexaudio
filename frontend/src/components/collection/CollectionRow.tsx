import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DiscogsCollectionItem } from "@dexaudio/shared-types";
import { api } from "@/services/api-client";
import { PartialMatchPanel } from "./PartialMatchPanel";

interface CollectionRowProps {
  item: DiscogsCollectionItem;
}

const statusColors: Record<string, string> = {
  matched: "bg-green-500/20 text-green-700 dark:text-green-400",
  partial: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  not_on_plex: "bg-red-500/20 text-red-700 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  matched: "Matched",
  partial: "Partial Match",
  not_on_plex: "Not on Plex",
};

export function CollectionRow({ item }: CollectionRowProps) {
  const queryClient = useQueryClient();
  const patch = useMutation({
    mutationFn: (body: { plexAlbumId?: string | null; status?: "matched" | "not_on_plex" }) =>
      api.patchDiscogsMatch(item.releaseId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["discogs-collection"] }),
  });

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-muted-foreground">
            {item.artist}
            {item.year ? ` · ${item.year}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs ${statusColors[item.matchStatus]}`}>
            {statusLabels[item.matchStatus] ?? item.matchStatus}
          </span>
          {item.plexAlbumId && item.matchStatus === "matched" && (
            <Link to={`/albums/${item.plexAlbumId}`} className="text-sm underline">
              Open in Plex
            </Link>
          )}
        </div>
      </div>
      {item.matchStatus === "partial" && item.matchCandidates && (
        <PartialMatchPanel
          releaseId={item.releaseId}
          candidates={item.matchCandidates}
          onConfirm={(plexAlbumId) => patch.mutate({ plexAlbumId, status: "matched" })}
          onReject={() => patch.mutate({ plexAlbumId: null, status: "not_on_plex" })}
        />
      )}
    </li>
  );
}
