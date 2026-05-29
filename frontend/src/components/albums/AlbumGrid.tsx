import { useState } from "react";
import { Link } from "react-router-dom";
import type { Album } from "@dexaudio/shared-types";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AlbumCoverImage } from "./AlbumCoverImage";
import { PlayAlbumOverlay } from "./PlayAlbumOverlay";
import { usePlayAlbum } from "@/hooks/use-play-album";
import type { CoverLoadPhase } from "@/hooks/use-album-cover-load";
import { cn } from "@/lib/utils";

interface AlbumGridProps {
  albums: Album[];
}

function textVisibilityClass(phase: CoverLoadPhase): string {
  if (phase === "absent" || phase === "failed" || phase === "revealed") {
    return "";
  }
  if (phase === "revealing") {
    return "album-cover-reveal-sync";
  }
  return "invisible opacity-0";
}

function AlbumGridCell({ item }: { item: Album }) {
  const playAlbum = usePlayAlbum();
  const [coverPhase, setCoverPhase] = useState<CoverLoadPhase>(
    item.artUrl ? "pending" : "absent",
  );
  const revealComplete =
    coverPhase === "revealed" || coverPhase === "absent" || coverPhase === "failed";

  return (
    <div
      className="group relative overflow-hidden rounded-lg border bg-card"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 200px" }}
    >
      <div className="relative">
        <AspectRatio ratio={1}>
          <AlbumCoverImage artUrl={item.artUrl} onPhaseChange={setCoverPhase} />
        </AspectRatio>
        <PlayAlbumOverlay
          albumTitle={item.title}
          onActivate={() => void playAlbum(item.id)}
          revealComplete={revealComplete}
        />
      </div>
      <div className={cn("p-2", textVisibilityClass(coverPhase))}>
        <Link
          to={`/albums/${item.id}`}
          className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open details for ${item.title}`}
          tabIndex={revealComplete ? undefined : -1}
          aria-hidden={!revealComplete}
        >
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">{item.artist}</p>
        </Link>
      </div>
    </div>
  );
}

export function AlbumGrid({ albums }: AlbumGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {albums.map((item) => (
        <AlbumGridCell key={item.id} item={item} />
      ))}
    </div>
  );
}
