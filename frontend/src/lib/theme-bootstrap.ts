import { getCuratedTheme } from "@/lib/curated-themes";
import { createDefaultAdvancedTheme } from "@/lib/theme-defaults";
import {
  applyAdvancedTheme,
  applyCuratedTheme,
  applyDataTheme,
} from "@/lib/theme-engine";
import { areThemeColorsValid } from "@/lib/theme-colors";
import { runThemeMigration } from "@/lib/theme-migration";
import {
  isValidCuratedThemeId,
  isValidThemeMode,
  setItem,
  StorageKeys,
  type AdvancedTheme,
  type CuratedThemeId,
  type CustomSelection,
  type ThemeMode,
} from "@/lib/local-storage";

export type ThemeBootstrapFallbackReason =
  | "invalid-theme-mode"
  | "corrupt-storage"
  | "missing-advanced-theme"
  | "invalid-curated-id"
  | "invalid-theme-colors";

export type ThemeBootstrapResult = {
  themeMode: ThemeMode;
  customSelection: CustomSelection;
  advancedThemes: AdvancedTheme[];
  migrationNotice: string | null;
  fallbackApplied: boolean;
  fallbackReason?: ThemeBootstrapFallbackReason;
};

let sessionBootstrapped = false;
let lastBootstrapResult: ThemeBootstrapResult | null = null;

function defaultCustomSelection(): CustomSelection {
  return { kind: "curated", id: "warm-tones" };
}

function ensureAdvancedThemes(themes: AdvancedTheme[]): AdvancedTheme[] {
  if (themes.length === 0) {
    const seeded = [createDefaultAdvancedTheme()];
    setItem(StorageKeys.customPresets, seeded);
    return seeded;
  }
  return themes;
}

function readRawThemeMode(): { ok: true; mode: ThemeMode } | { ok: false } {
  try {
    const raw = localStorage.getItem(StorageKeys.themeMode);
    if (raw === null) return { ok: true, mode: "sync" };
    const parsed: unknown = JSON.parse(raw);
    if (!isValidThemeMode(parsed)) return { ok: false };
    return { ok: true, mode: parsed };
  } catch {
    return { ok: false };
  }
}

function readRawAdvancedThemes(): { ok: true; themes: AdvancedTheme[] } | { ok: false } {
  try {
    const raw = localStorage.getItem(StorageKeys.customPresets);
    if (raw === null) return { ok: true, themes: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: false };
    return { ok: true, themes: parsed as AdvancedTheme[] };
  } catch {
    return { ok: false };
  }
}

function readRawCustomSelection(): CustomSelection | null {
  try {
    const raw = localStorage.getItem(StorageKeys.customSelection);
    if (raw === null) return null;
    return JSON.parse(raw) as CustomSelection;
  } catch {
    return null;
  }
}

function osPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applySyncResolved(): void {
  applyDataTheme("sync", osPrefersDark());
}

function applySyncFallback(
  reason: ThemeBootstrapFallbackReason,
  advancedThemes: AdvancedTheme[],
  migrationNotice: string | null,
): ThemeBootstrapResult {
  setItem(StorageKeys.themeMode, "sync");
  applySyncResolved();
  return {
    themeMode: "sync",
    customSelection: defaultCustomSelection(),
    advancedThemes,
    migrationNotice,
    fallbackApplied: true,
    fallbackReason: reason,
  };
}

function applyBuiltInMode(mode: "light" | "dark" | "sync"): ThemeBootstrapResult {
  if (mode === "sync") {
    applySyncResolved();
  } else {
    applyDataTheme(mode);
  }
  return {
    themeMode: mode,
    customSelection: defaultCustomSelection(),
    advancedThemes: ensureAdvancedThemes([]),
    migrationNotice: null,
    fallbackApplied: false,
  };
}

function validateCustomSelection(
  selection: CustomSelection | null,
  themes: AdvancedTheme[],
):
  | { ok: true; selection: CustomSelection; theme?: AdvancedTheme }
  | { ok: false; reason: ThemeBootstrapFallbackReason } {
  if (!selection) {
    return { ok: false, reason: "corrupt-storage" };
  }
  if (selection.kind === "curated") {
    if (!isValidCuratedThemeId(selection.id)) {
      return { ok: false, reason: "invalid-curated-id" };
    }
    return { ok: true, selection };
  }
  const theme = themes.find((t) => t.id === selection.id);
  if (!theme) {
    return { ok: false, reason: "missing-advanced-theme" };
  }
  if (!areThemeColorsValid(theme.colors)) {
    return { ok: false, reason: "invalid-theme-colors" };
  }
  return { ok: true, selection, theme };
}

function applyCustomSelection(
  selection: CustomSelection,
  theme: AdvancedTheme | undefined,
): void {
  if (selection.kind === "curated") {
    applyCuratedTheme(selection.id);
    return;
  }
  if (theme) applyAdvancedTheme(theme);
}

function computeBootstrap(): ThemeBootstrapResult {
  const migration = runThemeMigration();
  const migrationNotice = migration.notice;

  let themeModeRead: { ok: true; mode: ThemeMode } | { ok: false };
  let themesRead: { ok: true; themes: AdvancedTheme[] } | { ok: false };

  try {
    themeModeRead = readRawThemeMode();
    themesRead = readRawAdvancedThemes();
  } catch {
    return applySyncFallback("corrupt-storage", ensureAdvancedThemes([]), migrationNotice);
  }

  if (!themeModeRead.ok) {
    return applySyncFallback(
      "invalid-theme-mode",
      ensureAdvancedThemes(themesRead.ok ? themesRead.themes : []),
      migrationNotice,
    );
  }

  if (!themesRead.ok) {
    return applySyncFallback("corrupt-storage", ensureAdvancedThemes([]), migrationNotice);
  }

  const advancedThemes = ensureAdvancedThemes(themesRead.themes);
  const themeMode = themeModeRead.mode;

  if (themeMode === "light" || themeMode === "dark") {
    applyDataTheme(themeMode);
    const selection = readRawCustomSelection() ?? defaultCustomSelection();
    return {
      themeMode,
      customSelection: selection,
      advancedThemes,
      migrationNotice,
      fallbackApplied: false,
    };
  }

  if (themeMode === "sync") {
    applySyncResolved();
    const selection = readRawCustomSelection() ?? defaultCustomSelection();
    return {
      themeMode: "sync",
      customSelection: selection,
      advancedThemes,
      migrationNotice,
      fallbackApplied: false,
    };
  }

  const customValidation = validateCustomSelection(readRawCustomSelection(), advancedThemes);
  if (!customValidation.ok) {
    return applySyncFallback(customValidation.reason, advancedThemes, migrationNotice);
  }

  applyCustomSelection(customValidation.selection, customValidation.theme);
  return {
    themeMode: "custom",
    customSelection: customValidation.selection,
    advancedThemes,
    migrationNotice,
    fallbackApplied: false,
  };
}

/** Synchronous theme apply from localStorage — idempotent per page load. */
export function bootstrapThemeFromStorage(): ThemeBootstrapResult {
  if (sessionBootstrapped && lastBootstrapResult) {
    return lastBootstrapResult;
  }
  const result = computeBootstrap();
  sessionBootstrapped = true;
  lastBootstrapResult = result;
  return result;
}

export function isThemeBootstrapped(): boolean {
  return sessionBootstrapped;
}

/** Test-only reset */
export function resetThemeBootstrapForTests(): void {
  sessionBootstrapped = false;
  lastBootstrapResult = null;
}
