import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  useAlbumCoverLoad,
  type CoverLoadPhase,
} from "@/hooks/use-album-cover-load";
import { albumArtSrc } from "@/lib/album-art";

interface AlbumCoverImageProps {
  artUrl: string | undefined;
  className?: string;
  onPhaseChange?: (phase: CoverLoadPhase) => void;
  fallbackLabel?: string;
}

export function AlbumCoverImage({
  artUrl,
  className,
  onPhaseChange,
  fallbackLabel = "No art",
}: AlbumCoverImageProps) {
  const resolvedArtUrl = albumArtSrc(artUrl);
  const { phase, showFallback, showEmptySlot, imageRef, imageProps } =
    useAlbumCoverLoad(resolvedArtUrl);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  return (
    <div className={cn("relative h-full w-full", className)}>
      {showEmptySlot && <div className="absolute inset-0" aria-hidden />}
      {showFallback && (
        <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
          {fallbackLabel}
        </div>
      )}
      {resolvedArtUrl && !showFallback && (
        <img ref={imageRef} alt="" loading="lazy" {...imageProps} />
      )}
    </div>
  );
}
