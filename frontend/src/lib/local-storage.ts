const PREFIX = "dexaudio.";

export const StorageKeys = {
  themeMode: `${PREFIX}theme.mode`,
  customPresetId: `${PREFIX}theme.customPresetId`,
  autoQueueSimilar: `${PREFIX}playback.autoQueueSimilar`,
  crossfade: `${PREFIX}playback.crossfade`,
  /** Client prefs: specs/005-gapless-playback/contracts/playback-preferences.yaml */
  gaplessPlayback: `${PREFIX}playback.gapless`,
  /** Client prefs: specs/013-play-navigation-preference/contracts/playback-preferences.yaml */
  playNavigation: `${PREFIX}playback.playNavigation`,
  preCacheLookAhead: `${PREFIX}playback.preCacheLookAhead`,
  preCapGb: `${PREFIX}cache.preCapGb`,
  permanentCapGb: `${PREFIX}cache.permanentCapGb`,
  volume: `${PREFIX}volume`,
  customPresets: `${PREFIX}customPresets`,
  activeLibraryId: `${PREFIX}library.activeId`,
  playbackSession: `${PREFIX}playback.session`,
} as const;

/** Persists active library id and clears playback session when the library changes (FR-012). */
export function setActiveLibraryId(id: string): void {
  const previous = getItem(StorageKeys.activeLibraryId, "");
  if (previous && id && previous !== id) {
    removeItem(StorageKeys.playbackSession);
  }
  setItem(StorageKeys.activeLibraryId, id);
}

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

export type GaplessPlaybackPreference = {
  enabled: boolean;
};

export type ThemeMode = "sync" | "light" | "dark" | "custom";

export type PlayNavigationMode = "navigate" | "stay";

const VALID_PLAY_NAVIGATION = new Set<PlayNavigationMode>(["navigate", "stay"]);

export function getPlayNavigationMode(): PlayNavigationMode {
  const raw = getItem<string>(StorageKeys.playNavigation, "navigate");
  return VALID_PLAY_NAVIGATION.has(raw as PlayNavigationMode) ? (raw as PlayNavigationMode) : "navigate";
}

export function isGaplessPlaybackEnabled(): boolean {
  return getItem<GaplessPlaybackPreference>(StorageKeys.gaplessPlayback, { enabled: true }).enabled;
}

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
