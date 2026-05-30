import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TrackMarqueeProps {
  text: string;
  className?: string;
}

export function TrackMarquee({ text, className }: TrackMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const span = measureRef.current;
      if (!container || !span) return;
      setOverflows(span.scrollWidth > container.clientWidth);
    };
    measure();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  if (!text) return null;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full overflow-hidden", className)}
      title={overflows ? text : undefined}
    >
      <span
        ref={measureRef}
        className="pointer-events-none absolute whitespace-nowrap opacity-0"
        aria-hidden
      >
        {text}
      </span>
      {overflows ? (
        <div
          className={cn(
            "flex w-max whitespace-nowrap motion-safe:animate-marquee",
            "motion-reduce:max-w-full motion-reduce:truncate motion-reduce:animate-none",
          )}
        >
          <span data-testid="marquee-display" className="motion-safe:pr-8 motion-reduce:pr-0">
            {text}
          </span>
          <span className="motion-safe:pr-8 motion-reduce:hidden" aria-hidden>
            {text}
          </span>
        </div>
      ) : (
        <span data-testid="marquee-display" className="block truncate">
          {text}
        </span>
      )}
    </div>
  );
}
