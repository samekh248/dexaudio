import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHorizontalCarousel } from "@/hooks/use-horizontal-carousel";

interface AlbumGroupRowProps {
  title: string;
  entries: ReactNode[];
  /** When true, heading is rendered by parent LibraryGroupSection. */
  hideHeading?: boolean;
}

export function AlbumGroupRow({ title, entries, hideHeading = false }: AlbumGroupRowProps) {
  const {
    scrollRef,
    scrollForward,
    scrollBackward,
    canScrollLeft,
    canScrollRight,
    needsScrollControls,
  } = useHorizontalCarousel(entries.length);

  if (entries.length === 0) return null;

  const headingId = `group-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const carouselNavClass =
    "absolute top-0 bottom-2 z-10 h-auto w-14 rounded-none border-border/40 bg-card/30 backdrop-blur hover:border-border hover:bg-card/80";

  return (
    <div className={hideHeading ? undefined : "mb-8"}>
      {!hideHeading ? (
        <h2 id={headingId} className="mb-3 text-lg font-semibold">
          {title}
        </h2>
      ) : null}
      <div className="relative">
        <div
          ref={scrollRef}
          role="region"
          aria-label={`${title} carousel`}
          tabIndex={0}
          className="flex gap-4 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth scrollbar-hide focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {entries}
        </div>
        {needsScrollControls && canScrollLeft ? (
          <Button
            type="button"
            variant="ghost"
            className={`${carouselNavClass} left-0 border-r`}
            aria-label="Scroll left"
            onClick={scrollBackward}
          >
            <ChevronLeft className="h-10 w-10" strokeWidth={3} aria-hidden />
          </Button>
        ) : null}
        {needsScrollControls && canScrollRight ? (
          <Button
            type="button"
            variant="ghost"
            className={`${carouselNavClass} right-0 border-l`}
            aria-label="Scroll right"
            onClick={scrollForward}
          >
            <ChevronRight className="h-10 w-10" strokeWidth={3} aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
