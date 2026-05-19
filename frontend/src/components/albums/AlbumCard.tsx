import { Link } from "react-router-dom";
import type { Album } from "@dexaudio/shared-types";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { PlayAlbumOverlay } from "./PlayAlbumOverlay";
import { usePlayAlbum } from "@/hooks/use-play-album";

interface AlbumCardProps {
  album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
  const playAlbum = usePlayAlbum();

  return (
    <Card className="group relative w-[140px] shrink-0 overflow-hidden">
      <div className="relative">
        <AspectRatio ratio={1}>
          {album.artUrl ? (
            <img
              src={album.artUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
              No art
            </div>
          )}
        </AspectRatio>
        <PlayAlbumOverlay albumTitle={album.title} onActivate={() => void playAlbum(album.id)} />
      </div>
      <CardContent className="p-2">
        <Link
          to={`/albums/${album.id}`}
          className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open details for ${album.title}`}
        >
          <p className="truncate text-sm font-medium">{album.title}</p>
          <p className="truncate text-xs text-muted-foreground">{album.artist}</p>
        </Link>
      </CardContent>
    </Card>
  );
}
