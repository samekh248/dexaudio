import { useEffect } from "react";
import { getThemeMode } from "@/lib/local-storage.js";

export function useThemeSync() {
  useEffect(() => {
    const apply = () => {
      const mode = getThemeMode();
      const root = document.documentElement;
      if (mode === "sync") {
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.setAttribute("data-theme", dark ? "dark" : "light");
      } else {
        root.setAttribute("data-theme", mode === "custom" ? "dark" : mode);
      }
    };

    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
}
