import { useEffect, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useGroupRevealContext } from "./group-reveal-context";

interface GroupRevealEntryProps {
  index: number;
  ready: boolean;
  children: ReactNode;
}

export function GroupRevealEntry({ index, ready, children }: GroupRevealEntryProps) {
  const { phase, registerEntry, prefersReducedMotion, isInteractive } =
    useGroupRevealContext();

  useEffect(() => {
    registerEntry(index, ready);
  }, [index, ready, registerEntry]);

  const showSlide =
    phase === "animating" && !prefersReducedMotion;

  const style = {
    "--group-entry-index": index,
  } as CSSProperties;

  return (
    <div
      className={cn(
        showSlide && "library-group-entry-slide",
        !isInteractive && "pointer-events-none",
      )}
      style={style}
      aria-hidden={!isInteractive ? true : undefined}
    >
      {children}
    </div>
  );
}
