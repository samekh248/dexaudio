import { useAlbumGroups } from "@/hooks/use-album-groups";
import { getItem, StorageKeys } from "@/lib/local-storage";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlbumGroupRow } from "@/components/albums/AlbumGroupRow";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { ArtistSpotlightTile } from "@/components/albums/ArtistSpotlightTile";
import { BrowseAllTile } from "@/components/albums/BrowseAllTile";

export function AlbumsHomePage() {
  const libraryId = getItem(StorageKeys.activeLibraryId, "");
  const { data, isLoading, error } = useAlbumGroups(libraryId);

  if (!libraryId) {
    return (
      <EmptyState
        title="No Plex library selected"
        description="Connect your Plex server and choose a music library to browse albums."
        actionLabel="Open Settings"
        actionTo="/settings"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8" aria-busy="true">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-40 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load library"
        description="Plex may be unreachable or your credentials need updating."
        actionLabel="Check Plex settings"
        actionTo="/settings"
      />
    );
  }

  if (!data) return null;

  const hasAlbums =
    data.randomPicks.length > 0 ||
    data.recentlyPlayed.length > 0 ||
    data.recentlyAdded.length > 0 ||
    data.hiddenGems.length > 0 ||
    data.artistSpotlights.length > 0;

  if (!hasAlbums) {
    return (
      <EmptyState
        title="No albums in library"
        description="Sync your Plex music library to see curated groups here."
        actionLabel="Settings"
        actionTo="/settings"
      />
    );
  }

  const randomEntries = [
    ...data.randomPicks.map((album) => <AlbumCard key={album.id} album={album} />),
    <BrowseAllTile key="browse-all" />,
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Albums</h1>
      <AlbumGroupRow
        title="Recently Played"
        entries={data.recentlyPlayed.map((a) => (
          <AlbumCard key={a.id} album={a} />
        ))}
      />
      <AlbumGroupRow
        title="Recently Added"
        entries={data.recentlyAdded.map((a) => (
          <AlbumCard key={a.id} album={a} />
        ))}
      />
      <AlbumGroupRow
        title="Hidden Gems"
        entries={data.hiddenGems.map((a) => (
          <AlbumCard key={a.id} album={a} />
        ))}
      />
      <AlbumGroupRow title="Random Picks" entries={randomEntries} />
      <AlbumGroupRow
        title="Artist Spotlights"
        entries={data.artistSpotlights.map((s) => (
          <ArtistSpotlightTile key={s.artistId} spotlight={s} />
        ))}
      />
    </div>
  );
}
