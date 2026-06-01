import { useEffect } from "react";
import { applyDataTheme } from "@/lib/theme-engine";
import { useThemeStore } from "@/lib/theme-store";

export function useThemeSync() {
  const themeMode = useThemeStore((s) => s.themeMode);

  useEffect(() => {
    useThemeStore.getState().bootstrap();
  }, []);

  useEffect(() => {
    if (themeMode !== "sync") return;

    const apply = () => {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyDataTheme("sync", dark);
    };

    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [themeMode]);
}
