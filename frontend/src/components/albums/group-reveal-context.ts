import { createContext, useContext } from "react";
import type { GroupRevealPhase } from "@/hooks/use-library-group-reveal";

export interface GroupRevealContextValue {
  phase: GroupRevealPhase;
  registerEntry: (index: number, ready: boolean) => void;
  prefersReducedMotion: boolean;
  isInteractive: boolean;
}

export const GroupRevealContext = createContext<GroupRevealContextValue | null>(null);

export function useGroupRevealContext(): GroupRevealContextValue {
  const ctx = useContext(GroupRevealContext);
  if (!ctx) {
    throw new Error("useGroupRevealContext must be used within LibraryGroupReveal");
  }
  return ctx;
}
