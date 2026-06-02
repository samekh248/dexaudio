import { useEffect } from "react";
import { applyDataTheme } from "@/lib/theme-engine";
import { useThemeStore } from "@/lib/theme-store";

/**
 * OS theme listener for sync mode only. Store is initialized before React render
 * in main.tsx; do not bootstrap here — a mount-time bootstrap left themeMode at
 * "sync" in the first effect pass and overwrote hydrated light/dark/custom DOM.
 */
export function useThemeSync() {
  const themeMode = useThemeStore((s) => s.themeMode);

  useEffect(() => {
    if (themeMode !== "sync") return;

    const apply = () => {
      if (useThemeStore.getState().themeMode !== "sync") return;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyDataTheme("sync", dark);
    };

    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [themeMode]);
}
