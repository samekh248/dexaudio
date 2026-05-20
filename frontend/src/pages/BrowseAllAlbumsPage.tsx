import { useAllAlbums } from "@/hooks/use-all-albums";
import { getItem, StorageKeys } from "@/lib/local-storage";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlbumGrid } from "@/components/albums/AlbumGrid";

export function BrowseAllAlbumsPage() {
  const libraryId = getItem(StorageKeys.activeLibraryId, "");
  const { data, isLoading, error } = useAllAlbums(libraryId);

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
      <AlbumGrid
        albums={data.items.map((item) => ({
          id: item.id,
          title: item.title,
          artist: item.artist,
          artUrl: item.artUrl,
        }))}
      />
    </div>
  );
}
