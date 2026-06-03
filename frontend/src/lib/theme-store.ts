import { create } from "zustand";
import { getCuratedTheme } from "@/lib/curated-themes";
import { createDefaultAdvancedTheme } from "@/lib/theme-defaults";
import {
  applyAdvancedTheme,
  applyCuratedTheme,
  applyDataTheme,
} from "@/lib/theme-engine";
import { packageToAdvancedTheme, type ThemePackageV1 } from "@/lib/theme-package";
import { areThemeColorsValid } from "@/lib/theme-colors";
import {
  bootstrapThemeFromStorage,
  type ThemeBootstrapResult,
} from "@/lib/theme-bootstrap";
import type { ReconciledAppearance } from "@/lib/theme-hydration";
import {
  getAdvancedThemes,
  getCustomSelection,
  MAX_ADVANCED_THEMES,
  setItem,
  StorageKeys,
  type AdvancedTheme,
  type CuratedThemeId,
  type CustomSelection,
  type ThemeMode,
} from "@/lib/local-storage";

export { createDefaultAdvancedTheme } from "@/lib/theme-defaults";

function readAdvancedThemes(): AdvancedTheme[] {
  const themes = getAdvancedThemes();
  if (themes.length === 0) {
    const seeded = [createDefaultAdvancedTheme()];
    setItem(StorageKeys.customPresets, seeded);
    return seeded;
  }
  return themes;
}

function persistAdvancedThemes(themes: AdvancedTheme[]): void {
  setItem(StorageKeys.customPresets, themes);
}

function defaultCustomSelection(): CustomSelection {
  return { kind: "curated", id: "warm-tones" };
}

function customSelectionForStore(
  themeMode: ThemeMode,
  active: CustomSelection | null,
): CustomSelection {
  if (themeMode === "custom" && active) return active;
  return getCustomSelection() ?? defaultCustomSelection();
}

export type ThemeStore = {
  themeMode: ThemeMode;
  customSelection: CustomSelection;
  advancedThemes: AdvancedTheme[];
  draft: AdvancedTheme | null;
  savedDraft: AdvancedTheme | null;
  dirty: boolean;
  /** True only while the advanced theme settings panel is open (Edit). */
  editorOpen: boolean;
  migrationNotice: string | null;

  bootstrap(): void;
  clearMigrationNotice(): void;
  applyMode(mode: ThemeMode): boolean;
  applyCurated(id: CuratedThemeId): void;
  selectAdvanced(id: string): void;
  editAdvanced(id: string): void;
  startCreateAdvanced(): boolean;
  closeEditor(): void;
  loadDraftFromActive(): void;
  updateDraft(updater: (d: AdvancedTheme) => AdvancedTheme): void;
  resetDraft(): void;
  saveDraft(): string | null;
  duplicateAdvanced(id: string): string | null;
  duplicateCurated(id: CuratedThemeId): string | null;
  deleteAdvanced(id: string): string | null;
  renameAdvanced(id: string, name: string): void;
  importPackage(pkg: ThemePackageV1, mode: "add" | "replace", replaceId?: string): string | null;
  canAddAdvanced(): boolean;
};

function applySelection(selection: CustomSelection, themes: AdvancedTheme[]): void {
  if (selection.kind === "curated") {
    applyCuratedTheme(selection.id);
    return;
  }
  const theme = themes.find((t) => t.id === selection.id);
  if (theme) applyAdvancedTheme(theme);
}

function persistSelection(selection: CustomSelection): void {
  setItem(StorageKeys.customSelection, selection);
}

/** Align Zustand with DOM after synchronous bootstrap (before React render). */
export function initThemeStoreFromBootstrap(result: ThemeBootstrapResult): void {
  useThemeStore.setState({
    themeMode: result.themeMode,
    advancedThemes: result.advancedThemes,
    customSelection: result.customSelection,
    migrationNotice: result.migrationNotice,
    draft: null,
    savedDraft: null,
    dirty: false,
    editorOpen: false,
  });
}

/** Align Zustand with DOM after `hydrateThemeFromStorage()` (tests). */
export function initThemeStoreFromHydration(
  reconciled: ReconciledAppearance,
  migrationNotice: string | null = null,
): void {
  const advancedThemes = readAdvancedThemes();
  useThemeStore.setState({
    themeMode: reconciled.themeMode,
    advancedThemes,
    customSelection: customSelectionForStore(reconciled.themeMode, reconciled.customSelection),
    migrationNotice,
    draft: null,
    savedDraft: null,
    dirty: false,
    editorOpen: false,
  });
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  themeMode: "sync",
  customSelection: defaultCustomSelection(),
  advancedThemes: [],
  draft: null,
  savedDraft: null,
  dirty: false,
  editorOpen: false,
  migrationNotice: null,

  bootstrap() {
    initThemeStoreFromBootstrap(bootstrapThemeFromStorage());
  },

  clearMigrationNotice() {
    set({ migrationNotice: null });
  },

  applyMode(mode) {
    const { dirty } = get();
    if (dirty && !window.confirm("Discard unsaved theme changes?")) {
      return false;
    }
    setItem(StorageKeys.themeMode, mode);
    set({ themeMode: mode, dirty: false, draft: null, savedDraft: null, editorOpen: false });

    if (mode === "custom") {
      let { customSelection, advancedThemes } = get();
      if (!getCustomSelection()) {
        customSelection = defaultCustomSelection();
        persistSelection(customSelection);
        set({ customSelection });
      }
      applySelection(customSelection, advancedThemes);
    } else {
      applyDataTheme(mode);
    }
    return true;
  },

  applyCurated(id) {
    const selection: CustomSelection = { kind: "curated", id };
    persistSelection(selection);
    set({
      customSelection: selection,
      dirty: false,
      draft: null,
      savedDraft: null,
      editorOpen: false,
    });
    setItem(StorageKeys.themeMode, "custom");
    set({ themeMode: "custom" });
    applyCuratedTheme(id);
  },

  selectAdvanced(id) {
    const { dirty, advancedThemes } = get();
    if (dirty && !window.confirm("Discard unsaved theme changes?")) return;

    const theme = advancedThemes.find((t) => t.id === id);
    if (!theme) return;

    const selection: CustomSelection = { kind: "advanced", id };
    persistSelection(selection);
    set({
      customSelection: selection,
      dirty: false,
      draft: null,
      savedDraft: null,
      editorOpen: false,
      themeMode: "custom",
    });
    setItem(StorageKeys.themeMode, "custom");
    applyAdvancedTheme(theme);
  },

  editAdvanced(id) {
    const { dirty, advancedThemes } = get();
    if (dirty && !window.confirm("Discard unsaved theme changes?")) return;

    const theme = advancedThemes.find((t) => t.id === id);
    if (!theme) return;

    const savedDraft = structuredClone(theme);
    const selection: CustomSelection = { kind: "advanced", id };
    persistSelection(selection);
    setItem(StorageKeys.themeMode, "custom");
    set({
      customSelection: selection,
      themeMode: "custom",
      draft: structuredClone(theme),
      savedDraft,
      dirty: false,
      editorOpen: true,
    });
    applyAdvancedTheme(theme);
  },

  closeEditor() {
    const { dirty, customSelection, advancedThemes } = get();
    if (dirty && !window.confirm("Discard unsaved theme changes?")) return;
    set({ draft: null, savedDraft: null, dirty: false, editorOpen: false });
    if (customSelection.kind === "advanced") {
      const theme = advancedThemes.find((t) => t.id === customSelection.id);
      if (theme) applyAdvancedTheme(theme);
    }
  },

  startCreateAdvanced() {
    if (!get().canAddAdvanced()) {
      return false;
    }
    const theme = createDefaultAdvancedTheme();
    theme.name = `Theme ${get().advancedThemes.length + 1}`;
    const now = new Date().toISOString();
    theme.createdAt = now;
    theme.updatedAt = now;
    const nextThemes = [...get().advancedThemes, theme];
    persistAdvancedThemes(nextThemes);
    const selection: CustomSelection = { kind: "advanced", id: theme.id };
    persistSelection(selection);
    setItem(StorageKeys.themeMode, "custom");
    set({
      advancedThemes: nextThemes,
      customSelection: selection,
      themeMode: "custom",
      draft: null,
      savedDraft: null,
      dirty: false,
      editorOpen: false,
    });
    applyAdvancedTheme(theme);
    return true;
  },

  loadDraftFromActive() {
    const { customSelection, advancedThemes } = get();
    if (customSelection.kind !== "advanced") return;
    const theme = advancedThemes.find((t) => t.id === customSelection.id);
    if (!theme) return;
    get().editAdvanced(theme.id);
  },

  updateDraft(updater) {
    const draft = get().draft;
    if (!draft) return;
    const next = updater(draft);
    set({ draft: next, dirty: true });
    if (areThemeColorsValid(next.colors)) {
      applyAdvancedTheme(next);
    }
  },

  resetDraft() {
    const saved = get().savedDraft;
    if (!saved) return;
    const draft = structuredClone(saved);
    set({ draft, dirty: false });
    applyAdvancedTheme(draft);
  },

  saveDraft() {
    const { draft, advancedThemes } = get();
    if (!draft) return "Nothing to save.";
    const name = draft.name.trim();
    if (!name) return "Theme name is required.";

    const now = new Date().toISOString();
    const toSave: AdvancedTheme = {
      ...draft,
      name,
      updatedAt: now,
      createdAt: draft.createdAt || now,
    };

    const exists = advancedThemes.some((t) => t.id === toSave.id);
    let nextThemes: AdvancedTheme[];
    if (exists) {
      nextThemes = advancedThemes.map((t) => (t.id === toSave.id ? toSave : t));
    } else {
      if (advancedThemes.length >= MAX_ADVANCED_THEMES) {
        return `Maximum of ${MAX_ADVANCED_THEMES} advanced themes reached.`;
      }
      nextThemes = [...advancedThemes, toSave];
    }

    persistAdvancedThemes(nextThemes);
    const selection: CustomSelection = { kind: "advanced", id: toSave.id };
    persistSelection(selection);
    set({
      advancedThemes: nextThemes,
      customSelection: selection,
      savedDraft: structuredClone(toSave),
      draft: structuredClone(toSave),
      dirty: false,
      editorOpen: true,
      themeMode: "custom",
    });
    setItem(StorageKeys.themeMode, "custom");
    applyAdvancedTheme(toSave);
    return null;
  },

  duplicateAdvanced(id) {
    if (!get().canAddAdvanced()) {
      return `Maximum of ${MAX_ADVANCED_THEMES} advanced themes reached. Delete one first.`;
    }
    const source = get().advancedThemes.find((t) => t.id === id);
    if (!source) return "Theme not found.";

    const now = new Date().toISOString();
    const copy: AdvancedTheme = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      name: `Copy of ${source.name}`,
      createdAt: now,
      updatedAt: now,
    };
    const nextThemes = [...get().advancedThemes, copy];
    persistAdvancedThemes(nextThemes);
    const selection: CustomSelection = { kind: "advanced", id: copy.id };
    persistSelection(selection);
    set({
      advancedThemes: nextThemes,
      customSelection: selection,
      draft: null,
      savedDraft: null,
      dirty: false,
      editorOpen: false,
      themeMode: "custom",
    });
    setItem(StorageKeys.themeMode, "custom");
    applyAdvancedTheme(copy);
    return null;
  },

  duplicateCurated(id) {
    if (!get().canAddAdvanced()) {
      return `Maximum of ${MAX_ADVANCED_THEMES} advanced themes reached. Delete one first.`;
    }
    const curated = getCuratedTheme(id);
    const now = new Date().toISOString();
    const copy: AdvancedTheme = {
      id: crypto.randomUUID(),
      name: `${curated.name} (custom)`,
      colors: { ...curated.colors },
      supplementaryRules: "",
      createdAt: now,
      updatedAt: now,
    };
    const nextThemes = [...get().advancedThemes, copy];
    persistAdvancedThemes(nextThemes);
    const selection: CustomSelection = { kind: "advanced", id: copy.id };
    persistSelection(selection);
    set({
      advancedThemes: nextThemes,
      customSelection: selection,
      draft: null,
      savedDraft: null,
      dirty: false,
      editorOpen: false,
      themeMode: "custom",
    });
    setItem(StorageKeys.themeMode, "custom");
    applyAdvancedTheme(copy);
    return null;
  },

  deleteAdvanced(id) {
    const { advancedThemes, customSelection } = get();
    if (advancedThemes.length <= 1) {
      return "At least one advanced theme must remain.";
    }
    const nextThemes = advancedThemes.filter((t) => t.id !== id);
    persistAdvancedThemes(nextThemes);

    const wasActive =
      customSelection.kind === "advanced" && customSelection.id === id;
    const closingEdited = get().draft?.id === id;

    set({
      advancedThemes: nextThemes,
      ...(closingEdited || wasActive
        ? { draft: null, savedDraft: null, dirty: false, editorOpen: false }
        : {}),
    });

    if (wasActive) {
      get().applyMode("sync");
    }

    return null;
  },

  renameAdvanced(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextThemes = get().advancedThemes.map((t) =>
      t.id === id ? { ...t, name: trimmed, updatedAt: new Date().toISOString() } : t,
    );
    persistAdvancedThemes(nextThemes);
    set({ advancedThemes: nextThemes });
    const { draft } = get();
    if (draft?.id === id) {
      set({ draft: { ...draft, name: trimmed } });
    }
  },

  importPackage(pkg, mode, replaceId) {
    const { advancedThemes } = get();
    const collision = advancedThemes.find(
      (t) => t.name.toLowerCase() === pkg.name.toLowerCase(),
    );

    if (mode === "add") {
      if (!get().canAddAdvanced()) {
        return `Maximum of ${MAX_ADVANCED_THEMES} advanced themes reached.`;
      }
      if (collision) {
        return `A theme named "${pkg.name}" already exists. Use replace or rename.`;
      }
      const theme = packageToAdvancedTheme(pkg);
      const nextThemes = [...advancedThemes, theme];
      persistAdvancedThemes(nextThemes);
      const selection: CustomSelection = { kind: "advanced", id: theme.id };
      persistSelection(selection);
      set({
        advancedThemes: nextThemes,
        customSelection: selection,
        draft: null,
        savedDraft: null,
        dirty: false,
        editorOpen: false,
        themeMode: "custom",
      });
      setItem(StorageKeys.themeMode, "custom");
      applyAdvancedTheme(theme);
      return null;
    }

    const targetId = replaceId ?? collision?.id;
    if (!targetId) return "No theme to replace.";
    const theme = packageToAdvancedTheme(pkg, targetId);
    const existing = advancedThemes.find((t) => t.id === targetId);
    if (existing) {
      theme.createdAt = existing.createdAt;
    }
    const nextThemes = advancedThemes.map((t) => (t.id === targetId ? theme : t));
    persistAdvancedThemes(nextThemes);
    const selection: CustomSelection = { kind: "advanced", id: theme.id };
    persistSelection(selection);
    set({
      advancedThemes: nextThemes,
      customSelection: selection,
      draft: null,
      savedDraft: null,
      dirty: false,
      editorOpen: false,
      themeMode: "custom",
    });
    setItem(StorageKeys.themeMode, "custom");
    applyAdvancedTheme(theme);
    return null;
  },

  canAddAdvanced() {
    return get().advancedThemes.length < MAX_ADVANCED_THEMES;
  },
}));

/** Re-read from storage (tests). */
export function hydrateThemeStoreFromStorage(): void {
  useThemeStore.getState().bootstrap();
}
