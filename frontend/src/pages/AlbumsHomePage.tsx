import type { Album, ArtistSpotlight } from "@dexaudio/shared-types";
import { getItem, StorageKeys } from "@/lib/local-storage";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlbumGroupRow } from "@/components/albums/AlbumGroupRow";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { ArtistSpotlightTile } from "@/components/albums/ArtistSpotlightTile";
import { BrowseAllTile } from "@/components/albums/BrowseAllTile";
import { LibraryGroupSection } from "@/components/albums/LibraryGroupSection";
import { useLibraryHomeGroups } from "@/hooks/use-library-home-groups";

export function AlbumsHomePage() {
  const libraryId = getItem(StorageKeys.activeLibraryId, "");
  const groups = useLibraryHomeGroups(libraryId);

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

  if (groups.onlyEmptySuccess) {
    return (
      <EmptyState
        title="No albums in library"
        description="Sync your Plex music library to see curated groups here."
        actionLabel="Settings"
        actionTo="/settings"
      />
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Albums</h1>
      <LibraryGroupSection
        title="Recently Played"
        groupKey="recently-played"
        query={groups.recentlyPlayed}
      >
        {(items) => (
          <AlbumGroupRow
            title="Recently Played"
            entries={(items as Album[]).map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
            hideHeading
          />
        )}
      </LibraryGroupSection>
      <LibraryGroupSection
        title="Recently Added"
        groupKey="recently-added"
        query={groups.recentlyAdded}
      >
        {(items) => (
          <AlbumGroupRow
            title="Recently Added"
            entries={(items as Album[]).map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
            hideHeading
          />
        )}
      </LibraryGroupSection>
      <LibraryGroupSection title="Hidden Gems" groupKey="hidden-gems" query={groups.hiddenGems}>
        {(items) => (
          <AlbumGroupRow
            title="Hidden Gems"
            entries={(items as Album[]).map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
            hideHeading
          />
        )}
      </LibraryGroupSection>
      <LibraryGroupSection
        title="Random Picks"
        groupKey="random-picks"
        query={groups.randomPicks}
        showViewAll={false}
      >
        {(items) => {
          const randomEntries = [
            ...(items as Album[]).map((album) => <AlbumCard key={album.id} album={album} />),
            <BrowseAllTile key="browse-all" />,
          ];
          return (
            <AlbumGroupRow title="Random Picks" entries={randomEntries} hideHeading />
          );
        }}
      </LibraryGroupSection>
      <LibraryGroupSection
        title="Artist Spotlights"
        groupKey="artist-spotlights"
        query={groups.artistSpotlights}
      >
        {(items) => (
          <AlbumGroupRow
            title="Artist Spotlights"
            entries={(items as ArtistSpotlight[]).map((s) => (
              <ArtistSpotlightTile key={s.artistId} spotlight={s} />
            ))}
            hideHeading
          />
        )}
      </LibraryGroupSection>
    </div>
  );
}
