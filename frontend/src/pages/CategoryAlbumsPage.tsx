import { useLocation } from "react-router-dom";
import type { Album, LibraryGroupKey } from "@dexaudio/shared-types";
import { getItem, StorageKeys } from "@/lib/local-storage";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlbumGrid } from "@/components/albums/AlbumGrid";
import { useAlbumGroup } from "@/hooks/use-album-group";

const PAGE_CONFIG: Record<string, { groupKey: LibraryGroupKey; title: string }> = {
  "/library/recently-added": { groupKey: "recently-added", title: "Recently Added" },
  "/library/recently-played": { groupKey: "recently-played", title: "Recently Played" },
  "/library/hidden-gems": { groupKey: "hidden-gems", title: "Hidden Gems" },
};

export function CategoryAlbumsPage() {
  const { pathname } = useLocation();
  const config = PAGE_CONFIG[pathname];
  const libraryId = getItem(StorageKeys.activeLibraryId, "");
  const { data, isLoading, error } = useAlbumGroup(
    libraryId,
    config?.groupKey ?? "recently-added",
    20,
  );

  if (!config) {
    return <EmptyState title="Unknown category" description="This library view does not exist." />;
  }

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

  if (isLoading) return <p>Loading…</p>;
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

  const albums = (data?.items ?? []) as Album[];
  if (!albums.length) {
    return <EmptyState title="No albums" description={`No albums in ${config.title}.`} />;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{config.title}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{albums.length} albums</p>
      <AlbumGrid albums={albums} />
    </div>
  );
}
