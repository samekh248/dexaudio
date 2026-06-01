import { getCuratedTheme } from "@/lib/curated-themes";
import { contrastingTextOn } from "@/lib/theme-colors";
import {
  clearSupplementaryRules,
  injectSupplementaryRules,
  sanitizeSupplementaryRules,
} from "@/lib/theme-supplementary";
import type { AdvancedTheme, CuratedThemeId, ThemeColorSlots, ThemeMode } from "@/lib/local-storage";

export function applyThemeColorSlots(colors: ThemeColorSlots): void {
  const root = document.documentElement;
  const onAccent = contrastingTextOn(colors.accent, colors.primaryText, colors.background);
  const onSurface = contrastingTextOn(colors.surface, colors.primaryText, colors.background);

  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--foreground", colors.primaryText);
  root.style.setProperty("--card", colors.surface);
  root.style.setProperty("--card-foreground", onSurface);
  root.style.setProperty("--muted", colors.surface);
  root.style.setProperty("--muted-foreground", colors.secondaryText);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-foreground", onAccent);
  root.style.setProperty("--primary", colors.accent);
  root.style.setProperty("--primary-foreground", onAccent);
  root.style.setProperty("--secondary", colors.surface);
  root.style.setProperty("--secondary-foreground", onSurface);
  root.style.setProperty("--border", colors.surface);
  root.style.setProperty("--now-playing-highlight", colors.nowPlayingHighlight);
}

export function applyDataTheme(mode: ThemeMode, syncDark?: boolean): void {
  const root = document.documentElement;
  if (mode === "sync") {
    const dark = syncDark ?? window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", dark ? "dark" : "light");
    clearInlineThemeVars();
    clearSupplementaryRules();
    return;
  }
  if (mode === "custom") {
    root.setAttribute("data-theme", "custom");
    return;
  }
  root.setAttribute("data-theme", mode);
  clearInlineThemeVars();
  clearSupplementaryRules();
}

function clearInlineThemeVars(): void {
  const root = document.documentElement;
  const props = [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--border",
    "--now-playing-highlight",
  ];
  for (const p of props) root.style.removeProperty(p);
}

export function applyCuratedTheme(id: CuratedThemeId): void {
  applyDataTheme("custom");
  applyThemeColorSlots(getCuratedTheme(id).colors);
  clearSupplementaryRules();
}

export function applyAdvancedTheme(theme: AdvancedTheme): void {
  applyDataTheme("custom");
  applyThemeColorSlots(theme.colors);
  const rules = theme.supplementaryRules?.trim() ?? "";
  if (!rules) {
    clearSupplementaryRules();
    return;
  }
  const result = sanitizeSupplementaryRules(rules);
  if (result.ok && result.css) {
    injectSupplementaryRules(result.css);
  } else {
    clearSupplementaryRules();
  }
}
