const PREFIX = "dexaudio.";

export const LIBRARY_CHANGED_EVENT = "dexaudio.library-changed";

export const MAX_ADVANCED_THEMES = 6;

export const StorageKeys = {
  themeMode: `${PREFIX}theme.mode`,
  customPresetId: `${PREFIX}theme.customPresetId`,
  customSelection: `${PREFIX}theme.customSelection`,
  themeMigrationV1: `${PREFIX}theme.migrationV1`,
  autoQueueSimilar: `${PREFIX}playback.autoQueueSimilar`,
  crossfade: `${PREFIX}playback.crossfade`,
  /** Client prefs: specs/005-gapless-playback/contracts/playback-preferences.yaml */
  gaplessPlayback: `${PREFIX}playback.gapless`,
  /** Client prefs: specs/020-flac-lossless-playback/contracts/lossless-preference.md */
  losslessPlayback: `${PREFIX}playback.lossless`,
  /** Client prefs: specs/013-play-navigation-preference/contracts/playback-preferences.yaml */
  playNavigation: `${PREFIX}playback.playNavigation`,
  preCacheLookAhead: `${PREFIX}playback.preCacheLookAhead`,
  /** Client prefs: specs/025-queue-management/contracts/queue-preparation.md */
  queuePrepDepth: `${PREFIX}playback.queuePrepDepth`,
  preCapGb: `${PREFIX}cache.preCapGb`,
  permanentCapGb: `${PREFIX}cache.permanentCapGb`,
  volume: `${PREFIX}volume`,
  customPresets: `${PREFIX}customPresets`,
  activeLibraryId: `${PREFIX}library.activeId`,
  playbackSession: `${PREFIX}playback.session`,
  /** specs/024-plexamp-network-playback */
  playbackOutput: `${PREFIX}playback.output`,
  /** Show cast / network player output control in Now Playing */
  networkCastEnabled: `${PREFIX}playback.networkCastEnabled`,
} as const;

export type { PlaybackOutputPreference } from "@dexaudio/shared-types";

/** Persists active library id and clears playback session when the library changes (FR-012). */
export function setActiveLibraryId(id: string): void {
  const previous = getItem(StorageKeys.activeLibraryId, "");
  if (previous && id && previous !== id) {
    removeItem(StorageKeys.playbackSession);
  }
  setItem(StorageKeys.activeLibraryId, id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LIBRARY_CHANGED_EVENT));
  }
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

const VALID_THEME_MODES = new Set<ThemeMode>(["sync", "light", "dark", "custom"]);

export function isValidThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && VALID_THEME_MODES.has(value as ThemeMode);
}

export function parseThemeMode(raw: unknown): ThemeMode {
  return isValidThemeMode(raw) ? raw : "sync";
}

export type PlayNavigationMode = "navigate" | "stay";

const VALID_PLAY_NAVIGATION = new Set<PlayNavigationMode>(["navigate", "stay"]);

export function getPlayNavigationMode(): PlayNavigationMode {
  const raw = getItem<string>(StorageKeys.playNavigation, "navigate");
  return VALID_PLAY_NAVIGATION.has(raw as PlayNavigationMode) ? (raw as PlayNavigationMode) : "navigate";
}

export function isGaplessPlaybackEnabled(): boolean {
  return getItem<GaplessPlaybackPreference>(StorageKeys.gaplessPlayback, { enabled: true }).enabled;
}

export type CuratedThemeId = "warm-tones" | "retrowave" | "elegant";

const VALID_CURATED_IDS = new Set<CuratedThemeId>(["warm-tones", "retrowave", "elegant"]);

export function isValidCuratedThemeId(value: unknown): value is CuratedThemeId {
  return typeof value === "string" && VALID_CURATED_IDS.has(value as CuratedThemeId);
}

export type ThemeColorSlots = {
  background: string;
  surface: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  nowPlayingHighlight: string;
};

export type CustomSelection =
  | { kind: "curated"; id: CuratedThemeId }
  | { kind: "advanced"; id: string };

export interface AdvancedTheme {
  id: string;
  name: string;
  colors: ThemeColorSlots;
  supplementaryRules?: string;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use AdvancedTheme — kept for legacy migration input */
export interface CustomThemePreset {
  id: string;
  name: string;
  colors: ThemeColorSlots;
}

export function getCustomSelection(): CustomSelection | null {
  return getItem<CustomSelection | null>(StorageKeys.customSelection, null);
}

export function getAdvancedThemes(): AdvancedTheme[] {
  return getItem<AdvancedTheme[]>(StorageKeys.customPresets, []);
}

export function getThemeMode(): ThemeMode {
  return parseThemeMode(getItem<string>(StorageKeys.themeMode, "sync"));
}

export function getCustomPresets(): CustomThemePreset[] {
  return getItem(StorageKeys.customPresets, []);
}
