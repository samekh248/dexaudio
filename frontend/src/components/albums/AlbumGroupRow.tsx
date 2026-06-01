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
  const carouselNavSlotClass = "flex w-10 shrink-0 flex-col self-stretch";
  const carouselNavButtonClass =
    "flex !h-auto min-h-0 flex-1 w-full rounded-md border border-border/40 bg-card/80 px-0 py-0 hover:border-border hover:bg-card disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border/40 disabled:hover:bg-card/80";
  const leftDisabled = !needsScrollControls || !canScrollLeft;
  const rightDisabled = !needsScrollControls || !canScrollRight;

  return (
    <div className={hideHeading ? undefined : "mb-8"}>
      {!hideHeading ? (
        <h2 id={headingId} className="mb-3 text-lg font-semibold">
          {title}
        </h2>
      ) : null}
      <div className="flex items-stretch gap-1">
        <div className={carouselNavSlotClass}>
          <Button
            type="button"
            variant="ghost"
            data-testid="carousel-nav-left"
            className={carouselNavButtonClass}
            aria-label="Scroll left"
            disabled={leftDisabled}
            onClick={scrollBackward}
          >
            {!leftDisabled ? (
              <ChevronLeft className="h-8 w-8" strokeWidth={2.5} aria-hidden />
            ) : null}
          </Button>
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            ref={scrollRef}
            role="region"
            aria-label={`${title} carousel`}
            tabIndex={0}
            className="flex gap-4 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth scrollbar-hide focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {entries}
          </div>
          {canScrollRight ? (
            <div
              className="pointer-events-none absolute bottom-2 right-0 top-0 z-[5] w-20 bg-gradient-to-r from-transparent to-background"
              aria-hidden
              data-testid="carousel-right-fade"
            />
          ) : null}
        </div>
        <div className={carouselNavSlotClass}>
          <Button
            type="button"
            variant="ghost"
            data-testid="carousel-nav-right"
            className={carouselNavButtonClass}
            aria-label="Scroll right"
            disabled={rightDisabled}
            onClick={scrollForward}
          >
            {!rightDisabled ? (
              <ChevronRight className="h-8 w-8" strokeWidth={2.5} aria-hidden />
            ) : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
