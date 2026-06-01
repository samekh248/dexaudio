import { useEffect, type ReactNode } from "react";
import type { LibraryGroupKey } from "@dexaudio/shared-types";
import { cn } from "@/lib/utils";
import {
  useLibraryGroupReveal,
  type GroupRevealPhase,
} from "@/hooks/use-library-group-reveal";
import { GroupRevealContext } from "./group-reveal-context";

interface LibraryGroupRevealProps {
  libraryId: string;
  groupKey: LibraryGroupKey;
  entryCount: number;
  onPhaseChange?: (phase: GroupRevealPhase) => void;
  children: ReactNode;
}

export function LibraryGroupReveal({
  libraryId,
  groupKey,
  entryCount,
  onPhaseChange,
  children,
}: LibraryGroupRevealProps) {
  const reveal = useLibraryGroupReveal(libraryId, groupKey, entryCount);

  useEffect(() => {
    onPhaseChange?.(reveal.phase);
  }, [reveal.phase, onPhaseChange]);

  const hidden = reveal.phase === "preparing";
  const fadeOnly =
    reveal.phase === "animating" && reveal.prefersReducedMotion;

  return (
    <GroupRevealContext.Provider value={reveal}>
      <div
        className={cn(
          hidden && "pointer-events-none opacity-0",
          fadeOnly && "library-group-reveal-fade",
        )}
        aria-hidden={hidden ? true : undefined}
      >
        {children}
      </div>
    </GroupRevealContext.Provider>
  );
}
