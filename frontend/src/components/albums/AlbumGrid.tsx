import { Link } from "react-router-dom";
import type { Album } from "@dexaudio/shared-types";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { PlayAlbumOverlay } from "./PlayAlbumOverlay";
import { usePlayAlbum } from "@/hooks/use-play-album";

interface AlbumGridProps {
  albums: Album[];
}

export function AlbumGrid({ albums }: AlbumGridProps) {
  const playAlbum = usePlayAlbum();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {albums.map((item) => (
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
  );
}
