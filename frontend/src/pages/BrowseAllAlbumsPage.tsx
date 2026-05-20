import { Link } from "react-router-dom";
import { useAllAlbums } from "@/hooks/use-all-albums";
import { getItem, StorageKeys } from "@/lib/local-storage";
import { EmptyState } from "@/components/ui/EmptyState";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { PlayAlbumOverlay } from "@/components/albums/PlayAlbumOverlay";
import { usePlayAlbum } from "@/hooks/use-play-album";

export function BrowseAllAlbumsPage() {
  const libraryId = getItem(StorageKeys.activeLibraryId, "");
  const { data, isLoading, error } = useAllAlbums(libraryId);
  const playAlbum = usePlayAlbum();

  if (!libraryId) {
    return (
      <EmptyState
        title="No Plex library selected"
        description="Choose a music library in Settings."
        actionLabel="Settings"
        actionTo="/settings"
      />
    );
  }

  if (isLoading) return <p>Loading albums…</p>;
  if (error) {
    return (
      <EmptyState
        title="Could not load albums"
        description="Try again or check Plex settings."
        actionLabel="Settings"
        actionTo="/settings"
      />
    );
  }

  if (!data?.items.length) {
    return <EmptyState title="No albums" description="This library has no albums." />;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">All albums</h1>
      <p className="mb-4 text-sm text-muted-foreground">{data.total} albums</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {data.items.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-lg border bg-card"
            style={{ contentVisibility: "auto", containIntrinsicSize: "0 200px" }}
          >
            <div className="relative">
              <AspectRatio ratio={1}>
                {item.artUrl ? (
                  <img
                    src={item.artUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-xs">
                    No art
                  </div>
                )}
              </AspectRatio>
              <PlayAlbumOverlay
                albumTitle={item.title}
                onActivate={() => void playAlbum(item.id)}
              />
            </div>
            <div className="p-2">
              <Link
                to={`/albums/${item.id}`}
                className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Open details for ${item.title}`}
              >
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.artist}</p>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
