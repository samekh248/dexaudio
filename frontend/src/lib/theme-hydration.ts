import {
  applyAdvancedTheme,
  applyCuratedTheme,
  applyDataTheme,
} from "@/lib/theme-engine";
import {
  getAdvancedThemes,
  getCustomSelection,
  getItem,
  isValidCuratedThemeId,
  isValidThemeMode,
  parseThemeMode,
  setItem,
  StorageKeys,
  type AdvancedTheme,
  type CustomSelection,
  type ThemeMode,
} from "@/lib/local-storage";

export type ReconciledAppearance = {
  themeMode: ThemeMode;
  /** Set when `themeMode === "custom"` and selection is valid */
  customSelection: CustomSelection | null;
  repaired: boolean;
};

export type HydrationResult = ReconciledAppearance;

function isValidCustomSelection(
  selection: CustomSelection | null,
  advancedThemes: AdvancedTheme[],
): selection is CustomSelection {
  if (!selection || typeof selection !== "object") return false;
  if (selection.kind === "curated") {
    return isValidCuratedThemeId(selection.id);
  }
  if (selection.kind === "advanced") {
    return advancedThemes.some((t) => t.id === selection.id);
  }
  return false;
}

/** Read and validate persisted appearance; may downgrade custom → sync per spec FR-008/FR-009. */
export function reconcileAppearancePreference(): ReconciledAppearance {
  const advancedThemes = getAdvancedThemes();
  let themeMode = parseThemeMode(getItem<string>(StorageKeys.themeMode, "sync"));
  let repaired = false;

  if (themeMode !== "custom") {
    if (!isValidThemeMode(themeMode)) {
      themeMode = "sync";
      repaired = true;
    }
    return { themeMode, customSelection: null, repaired };
  }

  const selection = getCustomSelection();
  if (!isValidCustomSelection(selection, advancedThemes)) {
    return { themeMode: "sync", customSelection: null, repaired: true };
  }

  return { themeMode: "custom", customSelection: selection, repaired };
}

export function persistAppearanceRepairs(reconciled: ReconciledAppearance): void {
  if (!reconciled.repaired) return;
  setItem(StorageKeys.themeMode, reconciled.themeMode);
}

export function applyAppearancePreference(
  reconciled: ReconciledAppearance,
  advancedThemes: AdvancedTheme[],
): void {
  if (reconciled.themeMode === "custom" && reconciled.customSelection) {
    if (reconciled.customSelection.kind === "curated") {
      applyCuratedTheme(reconciled.customSelection.id);
      return;
    }
    const theme = advancedThemes.find((t) => t.id === reconciled.customSelection!.id);
    if (theme) {
      applyAdvancedTheme(theme);
      return;
    }
  }
  applyDataTheme(reconciled.themeMode);
}

/** Synchronous cold-load hydration (call from main.tsx before React render). */
export function hydrateThemeFromStorage(): HydrationResult {
  const advancedThemes = getAdvancedThemes();
  const reconciled = reconcileAppearancePreference();
  persistAppearanceRepairs(reconciled);
  applyAppearancePreference(reconciled, advancedThemes);
  return reconciled;
}
