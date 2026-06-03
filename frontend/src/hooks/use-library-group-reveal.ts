import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LibraryGroupKey } from "@dexaudio/shared-types";

export type GroupRevealPhase = "preparing" | "animating" | "revealed";

export const REVEALED_GROUP_KEYS = new Set<string>();

export const GROUP_ENTRY_STAGGER_MS = 60;
export const GROUP_ENTRY_SLIDE_MS = 400;
export const GROUP_REDUCE_MOTION_FADE_MS = 250;
/** Avoid albums staying invisible if cover load never signals ready. */
export const GROUP_PREPARE_TIMEOUT_MS = 12_000;

export function groupRevealSessionKey(libraryId: string, groupKey: LibraryGroupKey): string {
  return `${libraryId}:${groupKey}`;
}

export function clearRevealedGroupKeys(): void {
  REVEALED_GROUP_KEYS.clear();
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function allEntriesReady(readyByIndex: Record<number, boolean>, entryCount: number): boolean {
  if (entryCount <= 0) return true;
  for (let i = 0; i < entryCount; i += 1) {
    if (readyByIndex[i] !== true) return false;
  }
  return true;
}

export function useLibraryGroupReveal(
  libraryId: string,
  groupKey: LibraryGroupKey,
  entryCount: number,
) {
  const sessionKey = useMemo(
    () => groupRevealSessionKey(libraryId, groupKey),
    [libraryId, groupKey],
  );
  const skipAnimationRef = useRef(REVEALED_GROUP_KEYS.has(sessionKey));
  const [phase, setPhase] = useState<GroupRevealPhase>(() => {
    if (entryCount === 0 || skipAnimationRef.current) return "revealed";
    return "preparing";
  });
  const [readyByIndex, setReadyByIndex] = useState<Record<number, boolean>>({});
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const registerEntry = useCallback((index: number, ready: boolean) => {
    setReadyByIndex((prev) => {
      if (prev[index] === ready) return prev;
      return { ...prev, [index]: ready };
    });
  }, []);

  const completeReveal = useCallback(() => {
    REVEALED_GROUP_KEYS.add(sessionKey);
    setPhase("revealed");
  }, [sessionKey]);

  useEffect(() => {
    if (phase !== "preparing") return;
    if (!allEntriesReady(readyByIndex, entryCount)) return;
    setPhase("animating");
  }, [phase, readyByIndex, entryCount]);

  useEffect(() => {
    if (phase !== "preparing") return;
    const timer = window.setTimeout(() => completeReveal(), GROUP_PREPARE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, completeReveal]);

  useEffect(() => {
    if (phase !== "animating") return;
    const duration = reducedMotion
      ? GROUP_REDUCE_MOTION_FADE_MS
      : Math.max(0, entryCount - 1) * GROUP_ENTRY_STAGGER_MS + GROUP_ENTRY_SLIDE_MS;
    const timer = window.setTimeout(() => completeReveal(), duration);
    return () => window.clearTimeout(timer);
  }, [phase, entryCount, reducedMotion, completeReveal]);

  const isInteractive = phase === "revealed";

  return {
    phase,
    registerEntry,
    prefersReducedMotion: reducedMotion,
    isInteractive,
    completeReveal,
    sessionKey,
  };
}
