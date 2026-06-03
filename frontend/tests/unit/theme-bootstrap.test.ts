import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCuratedTheme } from "@/lib/curated-themes";
import { DEFAULT_ADVANCED_THEME } from "@/lib/theme-defaults";
import {
  bootstrapThemeFromStorage,
  isThemeBootstrapped,
  resetThemeBootstrapForTests,
} from "@/lib/theme-bootstrap";
import { StorageKeys, setItem } from "@/lib/local-storage";

describe("bootstrapThemeFromStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    resetThemeBootstrapForTests();
    setItem(StorageKeys.themeMigrationV1, true);
    document.documentElement.removeAttribute("data-theme");
    for (const prop of [
      "--background",
      "--primary",
      "--accent",
      "--accent-foreground",
    ]) {
      document.documentElement.style.removeProperty(prop);
    }
    document.getElementById("dexaudio-theme-supplement")?.remove();
  });

  it("applies Custom curated theme tokens on first boot", () => {
    setItem(StorageKeys.themeMode, "custom");
    setItem(StorageKeys.customSelection, { kind: "curated", id: "retrowave" });
    setItem(StorageKeys.customPresets, [DEFAULT_ADVANCED_THEME]);

    const result = bootstrapThemeFromStorage();

    expect(result.fallbackApplied).toBe(false);
    expect(result.themeMode).toBe("custom");
    expect(document.documentElement.getAttribute("data-theme")).toBe("custom");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      getCuratedTheme("retrowave").colors.accent,
    );
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(
      getCuratedTheme("retrowave").colors.accent,
    );
  });

  it("applies advanced theme with supplementary rules on first boot", () => {
    const theme = {
      ...DEFAULT_ADVANCED_THEME,
      id: "adv-1",
      supplementaryRules: '[data-theme="custom"] { --radius: 0.75rem; }',
    };
    setItem(StorageKeys.themeMode, "custom");
    setItem(StorageKeys.customSelection, { kind: "advanced", id: "adv-1" });
    setItem(StorageKeys.customPresets, [theme]);

    bootstrapThemeFromStorage();

    expect(document.documentElement.getAttribute("data-theme")).toBe("custom");
    expect(document.documentElement.style.getPropertyValue("--background")).toBe(
      theme.colors.background,
    );
    expect(document.getElementById("dexaudio-theme-supplement")).not.toBeNull();
  });

  it("applies Light mode complete palette", () => {
    setItem(StorageKeys.themeMode, "light");
    setItem(StorageKeys.customPresets, [DEFAULT_ADVANCED_THEME]);

    const result = bootstrapThemeFromStorage();

    expect(result.themeMode).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("");
  });

  it("applies Dark mode complete palette", () => {
    setItem(StorageKeys.themeMode, "dark");

    bootstrapThemeFromStorage();

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("resolves Sync to OS dark preference synchronously", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    setItem(StorageKeys.themeMode, "sync");

    bootstrapThemeFromStorage();

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    vi.unstubAllGlobals();
  });

  it("is idempotent on second call", () => {
    setItem(StorageKeys.themeMode, "custom");
    setItem(StorageKeys.customSelection, { kind: "curated", id: "warm-tones" });
    setItem(StorageKeys.customPresets, [DEFAULT_ADVANCED_THEME]);

    bootstrapThemeFromStorage();
    document.documentElement.style.setProperty("--primary", "tampered");

    const second = bootstrapThemeFromStorage();

    expect(isThemeBootstrapped()).toBe(true);
    expect(second.themeMode).toBe("custom");
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("tampered");
  });

  describe("fallback matrix", () => {
    beforeEach(() => {
      resetThemeBootstrapForTests();
    });

    it("F3: invalid theme mode reverts to Sync", () => {
      localStorage.setItem(StorageKeys.themeMode, JSON.stringify("neon"));
      setItem(StorageKeys.customPresets, [DEFAULT_ADVANCED_THEME]);

      const result = bootstrapThemeFromStorage();

      expect(result.fallbackApplied).toBe(true);
      expect(result.fallbackReason).toBe("invalid-theme-mode");
      expect(result.themeMode).toBe("sync");
      expect(JSON.parse(localStorage.getItem(StorageKeys.themeMode)!)).toBe("sync");
    });

    it("F4: corrupt customPresets reverts to Sync", () => {
      setItem(StorageKeys.themeMode, "custom");
      localStorage.setItem(StorageKeys.customPresets, JSON.stringify({ not: "array" }));

      const result = bootstrapThemeFromStorage();

      expect(result.fallbackApplied).toBe(true);
      expect(result.fallbackReason).toBe("corrupt-storage");
      expect(result.themeMode).toBe("sync");
    });

    it("F5: missing advanced theme id reverts to Sync", () => {
      setItem(StorageKeys.themeMode, "custom");
      setItem(StorageKeys.customSelection, { kind: "advanced", id: "gone" });
      setItem(StorageKeys.customPresets, [DEFAULT_ADVANCED_THEME]);

      const result = bootstrapThemeFromStorage();

      expect(result.fallbackApplied).toBe(true);
      expect(result.fallbackReason).toBe("missing-advanced-theme");
      expect(result.themeMode).toBe("sync");
    });

    it("F6: invalid curated id reverts to Sync", () => {
      setItem(StorageKeys.themeMode, "custom");
      setItem(StorageKeys.customSelection, { kind: "curated", id: "invalid" as never });
      setItem(StorageKeys.customPresets, [DEFAULT_ADVANCED_THEME]);

      const result = bootstrapThemeFromStorage();

      expect(result.fallbackApplied).toBe(true);
      expect(result.fallbackReason).toBe("invalid-curated-id");
    });

    it("F8: invalid supplementary rules apply semantic colors only", () => {
      const theme = {
        ...DEFAULT_ADVANCED_THEME,
        id: "adv-bad-rules",
        supplementaryRules: "@import url('evil.css');",
      };
      setItem(StorageKeys.themeMode, "custom");
      setItem(StorageKeys.customSelection, { kind: "advanced", id: "adv-bad-rules" });
      setItem(StorageKeys.customPresets, [theme]);

      const result = bootstrapThemeFromStorage();

      expect(result.fallbackApplied).toBe(false);
      expect(result.themeMode).toBe("custom");
      expect(document.documentElement.style.getPropertyValue("--background")).toBe(
        theme.colors.background,
      );
      expect(document.getElementById("dexaudio-theme-supplement")).toBeNull();
    });
  });
});
