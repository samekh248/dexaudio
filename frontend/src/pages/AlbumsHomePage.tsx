import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Album, ArtistSpotlight } from "@dexaudio/shared-types";
import { useActiveLibraryId } from "@/hooks/use-active-library-id";
import { api } from "@/services/api-client";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlbumGroupRow } from "@/components/albums/AlbumGroupRow";
import { AlbumCard } from "@/components/albums/AlbumCard";
import { ArtistSpotlightTile } from "@/components/albums/ArtistSpotlightTile";
import { BrowseAllTile } from "@/components/albums/BrowseAllTile";
import { LibraryGroupSection } from "@/components/albums/LibraryGroupSection";
import { GroupRevealEntry } from "@/components/albums/GroupRevealEntry";
import { useLibraryHomeGroups } from "@/hooks/use-library-home-groups";
import { clearRevealedGroupKeys } from "@/hooks/use-library-group-reveal";

function AlbumCarouselEntry({ album, index }: { album: Album; index: number }) {
  const [ready, setReady] = useState(() => !album.artUrl);
  return (
    <GroupRevealEntry index={index} ready={ready}>
      <AlbumCard album={album} onRevealCompleteChange={setReady} />
    </GroupRevealEntry>
  );
}

function SpotlightCarouselEntry({
  spotlight,
  index,
}: {
  spotlight: ArtistSpotlight;
  index: number;
}) {
  const [ready, setReady] = useState(false);
  return (
    <GroupRevealEntry index={index} ready={ready}>
      <ArtistSpotlightTile spotlight={spotlight} onRevealCompleteChange={setReady} />
    </GroupRevealEntry>
  );
}

export function AlbumsHomePage() {
  const libraryId = useActiveLibraryId();
  const { data: plexConnection, isPending: plexPending } = useQuery({
    queryKey: ["plex-connection"],
    queryFn: () => api.getPlexConnection(),
    staleTime: 30_000,
  });
  const groups = useLibraryHomeGroups(libraryId);

  const previousLibraryId = useRef<string | null>(null);
  useEffect(() => {
    if (previousLibraryId.current !== null && previousLibraryId.current !== libraryId) {
      clearRevealedGroupKeys();
    }
    previousLibraryId.current = libraryId;
  }, [libraryId]);

  if (plexPending) {
    return <p className="text-muted-foreground">Checking Plex connection…</p>;
  }

  if (!plexConnection?.connected) {
    return (
      <EmptyState
        title="Connect Plex to load your library"
        description={
          plexConnection?.issueMessage ??
          "Your Plex server can be running, but DexAudio needs you to sign in once so it can store a secure connection. Open Settings and complete Plex sign-in, then pick your music library."
        }
        actionLabel="Open Settings"
        actionTo="/settings"
      />
    );
  }

  if (plexConnection.issue === "server_unreachable" || plexConnection.issue === "reauth_recommended") {
    return (
      <EmptyState
        title="Plex connection needs attention"
        description={plexConnection.issueMessage ?? "Check Settings → Plex."}
        actionLabel="Open Settings"
        actionTo="/settings?tab=plex"
      />
    );
  }

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
        libraryId={libraryId}
        query={groups.recentlyPlayed}
      >
        {(items) => (
          <AlbumGroupRow
            title="Recently Played"
            entries={(items as Album[]).map((a, index) => (
              <AlbumCarouselEntry key={a.id} album={a} index={index} />
            ))}
            hideHeading
          />
        )}
      </LibraryGroupSection>
      <LibraryGroupSection
        title="Recently Added"
        groupKey="recently-added"
        libraryId={libraryId}
        query={groups.recentlyAdded}
      >
        {(items) => (
          <AlbumGroupRow
            title="Recently Added"
            entries={(items as Album[]).map((a, index) => (
              <AlbumCarouselEntry key={a.id} album={a} index={index} />
            ))}
            hideHeading
          />
        )}
      </LibraryGroupSection>
      <LibraryGroupSection
        title="Hidden Gems"
        groupKey="hidden-gems"
        libraryId={libraryId}
        query={groups.hiddenGems}
      >
        {(items) => (
          <AlbumGroupRow
            title="Hidden Gems"
            entries={(items as Album[]).map((a, index) => (
              <AlbumCarouselEntry key={a.id} album={a} index={index} />
            ))}
            hideHeading
          />
        )}
      </LibraryGroupSection>
      <LibraryGroupSection
        title="Random Picks"
        groupKey="random-picks"
        libraryId={libraryId}
        query={groups.randomPicks}
        showViewAll={false}
      >
        {(items) => {
          const albums = items as Album[];
          const randomEntries = [
            ...albums.map((album, index) => (
              <AlbumCarouselEntry key={album.id} album={album} index={index} />
            )),
            <GroupRevealEntry key="browse-all" index={albums.length} ready>
              <BrowseAllTile />
            </GroupRevealEntry>,
          ];
          return <AlbumGroupRow title="Random Picks" entries={randomEntries} hideHeading />;
        }}
      </LibraryGroupSection>
      <LibraryGroupSection
        title="Artist Spotlights"
        groupKey="artist-spotlights"
        libraryId={libraryId}
        query={groups.artistSpotlights}
        showViewAll={false}
      >
        {(items) => (
          <AlbumGroupRow
            title="Artist Spotlights"
            entries={(items as ArtistSpotlight[]).map((s, index) => (
              <SpotlightCarouselEntry key={s.artistId} spotlight={s} index={index} />
            ))}
            hideHeading
          />
        )}
      </LibraryGroupSection>
    </div>
  );
}
