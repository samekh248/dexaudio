import { useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  useAlbumCoverLoad,
  type CoverLoadPhase,
} from "@/hooks/use-album-cover-load";

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
  const { phase, showFallback, showEmptySlot, imageRef, imageProps } =
    useAlbumCoverLoad(artUrl);

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
      {artUrl && !showFallback && (
        <img ref={imageRef} alt="" loading="lazy" {...imageProps} />
      )}
    </div>
  );
}
