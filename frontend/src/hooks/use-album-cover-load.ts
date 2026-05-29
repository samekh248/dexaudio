import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type CoverLoadPhase = "absent" | "pending" | "revealing" | "revealed" | "failed";

export const COVER_LOAD_TIMEOUT_MS = 10_000;
export const REVEALED_URL_CACHE = new Set<string>();

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function initialPhase(artUrl: string | undefined): CoverLoadPhase {
  if (!artUrl) return "absent";
  if (REVEALED_URL_CACHE.has(artUrl)) return "revealed";
  return "pending";
}

export function useAlbumCoverLoad(artUrl: string | undefined) {
  const imageRef = useRef<HTMLImageElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<CoverLoadPhase>(() => initialPhase(artUrl));

  const clearLoadTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startReveal = useCallback(() => {
    clearLoadTimeout();
    setPhase("revealing");
  }, [clearLoadTimeout]);

  const failLoad = useCallback(() => {
    clearLoadTimeout();
    setPhase("failed");
  }, [clearLoadTimeout]);

  useEffect(() => {
    clearLoadTimeout();
    if (!artUrl) {
      setPhase("absent");
      return;
    }
    if (REVEALED_URL_CACHE.has(artUrl)) {
      setPhase("revealed");
      return;
    }
    setPhase("pending");
    timeoutRef.current = setTimeout(failLoad, COVER_LOAD_TIMEOUT_MS);
    return clearLoadTimeout;
  }, [artUrl, clearLoadTimeout, failLoad]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img || !artUrl || phase !== "pending") return;
    if (img.complete && img.naturalWidth > 0) {
      startReveal();
    }
  }, [artUrl, phase, startReveal]);

  const handleLoad = useCallback(() => {
    setPhase((current) => {
      if (current !== "pending") return current;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return "revealing";
    });
  }, []);

  const handleError = useCallback(() => {
    failLoad();
  }, [failLoad]);

  const handleAnimationEnd = useCallback(() => {
    setPhase((current) => {
      if (current !== "revealing") return current;
      if (artUrl) REVEALED_URL_CACHE.add(artUrl);
      return "revealed";
    });
  }, [artUrl]);

  const reducedMotion = prefersReducedMotion();
  const revealComplete = phase === "revealed" || phase === "absent" || phase === "failed";
  const showFallback = phase === "absent" || phase === "failed";
  const showEmptySlot = phase === "pending";

  const revealClassName =
    phase === "revealing"
      ? reducedMotion
        ? "album-cover-reveal--fade-only"
        : "album-cover-reveal"
      : "";

  const imageClassName = cn(
    "h-full w-full object-cover",
    phase === "pending" && "opacity-0",
    revealClassName,
  );

  return {
    phase,
    showFallback,
    showEmptySlot,
    revealComplete,
    imageRef,
    imageProps: {
      src: artUrl ?? "",
      onLoad: handleLoad,
      onError: handleError,
      onAnimationEnd: handleAnimationEnd,
      className: imageClassName,
    },
    reducedMotion,
  };
}
