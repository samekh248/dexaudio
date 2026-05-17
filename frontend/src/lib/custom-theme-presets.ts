import type { CustomThemePreset } from "./local-storage.js";

export function canDeletePreset(presets: CustomThemePreset[]): boolean {
  return presets.length > 1;
}

export function applyCustomPreset(preset: CustomThemePreset) {
  const root = document.documentElement;
  root.style.setProperty("--background", preset.colors.background);
  root.style.setProperty("--foreground", preset.colors.primaryText);
  root.style.setProperty("--card", preset.colors.surface);
  root.style.setProperty("--accent", preset.colors.accent);
}

export const DEFAULT_CUSTOM_PRESET: CustomThemePreset = {
  id: "default",
  name: "Default",
  colors: {
    background: "222 47% 6%",
    surface: "222 47% 9%",
    primaryText: "210 40% 98%",
    secondaryText: "215 20% 65%",
    accent: "217 33% 17%",
    nowPlayingHighlight: "210 40% 98%",
  },
};
