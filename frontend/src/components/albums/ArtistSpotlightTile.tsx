import { Link } from "react-router-dom";
import type { ArtistSpotlight } from "@dexaudio/shared-types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { AlbumCoverImage } from "./AlbumCoverImage";
import { usePlayArtist } from "@/hooks/use-play-artist";

interface ArtistSpotlightTileProps {
  spotlight: ArtistSpotlight;
}

export function ArtistSpotlightTile({ spotlight }: ArtistSpotlightTileProps) {
  const playArtist = usePlayArtist();
  const covers = spotlight.albumArtUrls.length
    ? spotlight.albumArtUrls
    : [undefined, undefined, undefined];

  return (
    <Card className="group relative w-[160px] shrink-0 overflow-hidden">
      <div className="relative mx-auto mt-3 h-28 w-24">
        {covers.slice(0, 3).map((url, i) => (
          <div
            key={i}
            className="absolute h-20 w-20 overflow-hidden rounded shadow-md ring-1 ring-border"
            style={{
              left: `${i * 8}px`,
              top: `${i * 4}px`,
              transform: `rotate(${i === 0 ? -4 : i === 1 ? 2 : 6}deg)`,
              zIndex: i + 1,
            }}
          >
            <AlbumCoverImage artUrl={url} fallbackLabel="—" />
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute bottom-0 right-0 z-10 h-9 w-9 rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          aria-label={`Play all albums by ${spotlight.artistName}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void playArtist(spotlight.artistId);
          }}
        >
          <Play className="h-4 w-4 fill-current text-white" aria-hidden />
        </Button>
      </div>
      <CardContent className="p-2 pt-3">
        <Link
          to={`/artists/${spotlight.artistId}`}
          className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open albums by ${spotlight.artistName}`}
        >
          <p className="truncate text-sm font-medium">{spotlight.artistName}</p>
          <p className="text-xs text-muted-foreground">{spotlight.albumCount} albums</p>
        </Link>
      </CardContent>
    </Card>
  );
}
