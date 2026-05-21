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

  return (
    <div className={hideHeading ? undefined : "mb-8"}>
      {!hideHeading ? (
        <h2 id={headingId} className="mb-3 text-lg font-semibold">
          {title}
        </h2>
      ) : null}
      <div className="flex items-stretch">
        {needsScrollControls && canScrollLeft ? (
          <div className="w-10 shrink-0 self-stretch">
            <Button
              type="button"
              variant="ghost"
              className="h-full w-full rounded-none"
              aria-label="Scroll left"
              onClick={scrollBackward}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Button>
          </div>
        ) : needsScrollControls ? (
          <div className="w-10 shrink-0 self-stretch" aria-hidden />
        ) : null}
        <div
          ref={scrollRef}
          role="region"
          aria-label={`${title} carousel`}
          tabIndex={0}
          className="flex min-w-0 flex-1 gap-4 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth scrollbar-hide focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {entries}
        </div>
        {needsScrollControls && canScrollRight ? (
          <div className="w-10 shrink-0 self-stretch">
            <Button
              type="button"
              variant="ghost"
              className="h-full w-full rounded-none"
              aria-label="Scroll right"
              onClick={scrollForward}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Button>
          </div>
        ) : needsScrollControls ? (
          <div className="w-10 shrink-0 self-stretch" aria-hidden />
        ) : null}
      </div>
    </div>
  );
}
