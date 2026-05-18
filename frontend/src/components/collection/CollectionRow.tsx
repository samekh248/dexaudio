import { Link } from "react-router-dom";
import type { DiscogsCollectionItem } from "@dexaudio/shared-types";

interface CollectionRowProps {
  item: DiscogsCollectionItem;
}

const statusColors: Record<string, string> = {
  matched: "bg-green-500/20 text-green-700 dark:text-green-400",
  partial: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  not_on_plex: "bg-red-500/20 text-red-700 dark:text-red-400",
};

export function CollectionRow({ item }: CollectionRowProps) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-medium">{item.title}</p>
        <p className="text-sm text-muted-foreground">
          {item.artist}
          {item.year ? ` · ${item.year}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs ${statusColors[item.matchStatus]}`}>
          {item.matchStatus.replace(/_/g, " ")}
        </span>
        {item.plexAlbumId && (
          <Link to={`/albums/${item.plexAlbumId}`} className="text-sm underline">
            Open in Plex
          </Link>
        )}
      </div>
    </li>
  );
}
