import { useState } from "react";
import { Link } from "react-router-dom";
import type { Album } from "@dexaudio/shared-types";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AlbumCoverImage } from "./AlbumCoverImage";
import { PlayAlbumOverlay } from "./PlayAlbumOverlay";
import { usePlayAlbum } from "@/hooks/use-play-album";
import type { CoverLoadPhase } from "@/hooks/use-album-cover-load";
import { cn } from "@/lib/utils";

interface AlbumCardProps {
  album: Album;
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

export function AlbumCard({ album }: AlbumCardProps) {
  const playAlbum = usePlayAlbum();
  const [coverPhase, setCoverPhase] = useState<CoverLoadPhase>(
    album.artUrl ? "pending" : "absent",
  );
  const revealComplete =
    coverPhase === "revealed" || coverPhase === "absent" || coverPhase === "failed";

  return (
    <Card className="group relative w-[160px] shrink-0 overflow-hidden">
      <div className="relative">
        <AspectRatio ratio={1}>
          <AlbumCoverImage artUrl={album.artUrl} onPhaseChange={setCoverPhase} />
        </AspectRatio>
        <PlayAlbumOverlay
          albumTitle={album.title}
          onActivate={() => void playAlbum(album.id)}
          revealComplete={revealComplete}
        />
      </div>
      <CardContent className={cn("p-2", textVisibilityClass(coverPhase))}>
        <Link
          to={`/albums/${album.id}`}
          className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open details for ${album.title}`}
          tabIndex={revealComplete ? undefined : -1}
          aria-hidden={!revealComplete}
        >
          <p className="truncate text-sm font-medium">{album.title}</p>
          <p className="truncate text-xs text-muted-foreground">{album.artist}</p>
        </Link>
      </CardContent>
    </Card>
  );
}
