const PREFIX = "dexaudio.";

export const StorageKeys = {
  themeMode: `${PREFIX}theme.mode`,
  customPresetId: `${PREFIX}theme.customPresetId`,
  autoQueueSimilar: `${PREFIX}playback.autoQueueSimilar`,
  crossfade: `${PREFIX}playback.crossfade`,
  preCacheLookAhead: `${PREFIX}playback.preCacheLookAhead`,
  preCapGb: `${PREFIX}cache.preCapGb`,
  permanentCapGb: `${PREFIX}cache.permanentCapGb`,
  customPresets: `${PREFIX}customPresets`,
  activeLibraryId: `${PREFIX}library.activeId`,
} as const;

export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

export type ThemeMode = "sync" | "light" | "dark" | "custom";

export interface CustomThemePreset {
  id: string;
  name: string;
  colors: {
    background: string;
    surface: string;
    primaryText: string;
    secondaryText: string;
    accent: string;
    nowPlayingHighlight: string;
  };
}

export function getThemeMode(): ThemeMode {
  return getItem(StorageKeys.themeMode, "sync" as ThemeMode);
}

export function getCustomPresets(): CustomThemePreset[] {
  return getItem(StorageKeys.customPresets, []);
}
