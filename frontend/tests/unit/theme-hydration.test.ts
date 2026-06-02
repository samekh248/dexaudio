import { beforeEach, describe, expect, it } from "vitest";
import { applyDataTheme } from "@/lib/theme-engine";
import {
  hydrateThemeFromStorage,
  reconcileAppearancePreference,
} from "@/lib/theme-hydration";
import { runThemeMigration } from "@/lib/theme-migration";
import { initThemeStoreFromHydration, useThemeStore } from "@/lib/theme-store";
import {
  getThemeMode,
  StorageKeys,
  setItem,
  type AdvancedTheme,
  type ThemeColorSlots,
} from "@/lib/local-storage";

const SLOTS: ThemeColorSlots = {
  background: "222 47% 6%",
  surface: "222 47% 9%",
  primaryText: "210 40% 98%",
  secondaryText: "215 20% 65%",
  accent: "217 33% 17%",
  nowPlayingHighlight: "210 40% 98%",
};

function advancedTheme(id: string): AdvancedTheme {
  return {
    id,
    name: "Test",
    colors: SLOTS,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("hydrateThemeFromStorage", () => {
  beforeEach(() => localStorage.clear());

  it("applies light mode from storage", () => {
    setItem(StorageKeys.themeMode, "light");
    hydrateThemeFromStorage();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(getThemeMode()).toBe("light");
  });

  it("applies dark mode from storage", () => {
    setItem(StorageKeys.themeMode, "dark");
    hydrateThemeFromStorage();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("applies sync mode from storage", () => {
    setItem(StorageKeys.themeMode, "sync");
    hydrateThemeFromStorage();
    expect(document.documentElement.getAttribute("data-theme")).toMatch(/^(light|dark)$/);
  });

  it("applies curated custom theme from storage", () => {
    setItem(StorageKeys.themeMode, "custom");
    setItem(StorageKeys.customSelection, { kind: "curated", id: "retrowave" });
    hydrateThemeFromStorage();
    expect(document.documentElement.getAttribute("data-theme")).toBe("custom");
    expect(getThemeMode()).toBe("custom");
  });

  it("applies advanced custom theme from storage", () => {
    const theme = advancedTheme("adv-1");
    setItem(StorageKeys.customPresets, [theme]);
    setItem(StorageKeys.themeMode, "custom");
    setItem(StorageKeys.customSelection, { kind: "advanced", id: "adv-1" });
    hydrateThemeFromStorage();
    expect(document.documentElement.getAttribute("data-theme")).toBe("custom");
    expect(document.documentElement.style.getPropertyValue("--background")).toBe(SLOTS.background);
  });

  it("repairs missing advanced id to sync and persists", () => {
    setItem(StorageKeys.customPresets, [advancedTheme("other")]);
    setItem(StorageKeys.themeMode, "custom");
    setItem(StorageKeys.customSelection, { kind: "advanced", id: "gone" });
    const result = hydrateThemeFromStorage();
    expect(result.themeMode).toBe("sync");
    expect(result.repaired).toBe(true);
    expect(getThemeMode()).toBe("sync");
    expect(document.documentElement.getAttribute("data-theme")).toMatch(/^(light|dark)$/);
  });

  it("coerces invalid themeMode string to sync", () => {
    localStorage.setItem(StorageKeys.themeMode, JSON.stringify("not-a-mode"));
    hydrateThemeFromStorage();
    expect(getThemeMode()).toBe("sync");
  });

  it("produces identical mode on sequential hydrates (session simulation)", () => {
    setItem(StorageKeys.themeMode, "dark");
    const first = hydrateThemeFromStorage();
    const second = hydrateThemeFromStorage();
    expect(second.themeMode).toBe(first.themeMode);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("after migration then hydrate preserves custom curated selection", () => {
    setItem(StorageKeys.customPresets, [
      {
        id: "legacy-1",
        name: "Legacy",
        colors: {
          background: "260 35% 8%",
          surface: "260 28% 13%",
          primaryText: "300 15% 96%",
          secondaryText: "260 12% 68%",
          accent: "330 85% 58%",
          nowPlayingHighlight: "195 95% 62%",
        },
      },
    ]);
    setItem(StorageKeys.customPresetId, "legacy-1");
    runThemeMigration();
    hydrateThemeFromStorage();
    expect(getThemeMode()).toBe("custom");
    const selection = reconcileAppearancePreference();
    expect(selection.customSelection).toEqual({ kind: "curated", id: "retrowave" });
  });

  it("defaults to sync when storage is empty", () => {
    hydrateThemeFromStorage();
    expect(getThemeMode()).toBe("sync");
  });

  it("initThemeStoreFromHydration keeps dark after sync-listener guard check", () => {
    setItem(StorageKeys.themeMode, "dark");
    const reconciled = hydrateThemeFromStorage();
    initThemeStoreFromHydration(reconciled);
    expect(useThemeStore.getState().themeMode).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    if (useThemeStore.getState().themeMode === "sync") {
      applyDataTheme("sync", window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("stale sync store state would clobber hydrated dark without init", () => {
    setItem(StorageKeys.themeMode, "dark");
    hydrateThemeFromStorage();
    useThemeStore.setState({ themeMode: "sync" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    applyDataTheme("sync", window.matchMedia("(prefers-color-scheme: dark)").matches);
    expect(document.documentElement.getAttribute("data-theme")).not.toBe("dark");
  });
});
