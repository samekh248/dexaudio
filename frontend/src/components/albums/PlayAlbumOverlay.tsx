import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface PlayAlbumOverlayProps {
  albumTitle: string;
  onActivate: () => void;
  revealComplete?: boolean;
}

export function PlayAlbumOverlay({
  albumTitle,
  onActivate,
  revealComplete = true,
}: PlayAlbumOverlayProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={
        revealComplete
          ? "absolute inset-0 z-10 m-auto h-12 w-12 rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          : "pointer-events-none absolute inset-0 z-10 m-auto h-12 w-12 rounded-full bg-black/50 opacity-0"
      }
      aria-hidden={!revealComplete}
      tabIndex={revealComplete ? undefined : -1}
      aria-label={`Play ${albumTitle}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onActivate();
      }}
    >
      <Play className="h-6 w-6 fill-current text-white" aria-hidden />
    </Button>
  );
}
