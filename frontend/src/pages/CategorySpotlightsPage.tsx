import { getItem, StorageKeys } from "@/lib/local-storage";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArtistSpotlightTile } from "@/components/albums/ArtistSpotlightTile";
import { useAlbumGroup } from "@/hooks/use-album-group";
import type { ArtistSpotlight } from "@dexaudio/shared-types";

export function CategorySpotlightsPage() {
  const libraryId = getItem(StorageKeys.activeLibraryId, "");
  const { data, isLoading, error } = useAlbumGroup(libraryId, "artist-spotlights", 20);

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
        title="Could not load artists"
        description="Try again or check Plex settings."
        actionLabel="Settings"
        actionTo="/settings"
      />
    );
  }

  const spotlights = (data?.items ?? []) as ArtistSpotlight[];
  if (!spotlights.length) {
    return <EmptyState title="No artists" description="No artist spotlights available." />;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Artist Spotlights</h1>
      <p className="mb-4 text-sm text-muted-foreground">{spotlights.length} artists</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {spotlights.map((s) => (
          <ArtistSpotlightTile key={s.artistId} spotlight={s} />
        ))}
      </div>
    </div>
  );
}
