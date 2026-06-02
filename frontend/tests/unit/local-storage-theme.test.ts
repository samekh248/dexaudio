import { describe, expect, it, beforeEach } from "vitest";
import {
  getCustomPresets,
  getThemeMode,
  isValidCuratedThemeId,
  isValidThemeMode,
  parseThemeMode,
  StorageKeys,
  setItem,
} from "@/lib/local-storage";

describe("theme localStorage", () => {
  beforeEach(() => localStorage.clear());

  it("reads theme mode default", () => {
    expect(getThemeMode()).toBe("sync");
  });

  it("reads custom presets", () => {
    setItem(StorageKeys.customPresets, [{ id: "1", name: "A", colors: {} as never }]);
    expect(getCustomPresets()).toHaveLength(1);
  });

  it("parseThemeMode falls back to sync for invalid values", () => {
    expect(parseThemeMode("dark")).toBe("dark");
    expect(parseThemeMode("invalid")).toBe("sync");
    expect(parseThemeMode(null)).toBe("sync");
  });

  it("isValidThemeMode and isValidCuratedThemeId", () => {
    expect(isValidThemeMode("custom")).toBe(true);
    expect(isValidThemeMode("neon")).toBe(false);
    expect(isValidCuratedThemeId("warm-tones")).toBe(true);
    expect(isValidCuratedThemeId("other")).toBe(false);
  });

  it("getThemeMode coerces corrupt stored mode", () => {
    localStorage.setItem(StorageKeys.themeMode, JSON.stringify("bogus"));
    expect(getThemeMode()).toBe("sync");
  });
});
