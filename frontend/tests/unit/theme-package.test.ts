import { describe, expect, it } from "vitest";
import { parseThemePackageV1, advancedThemeToPackage } from "@/lib/theme-package";
import { DEFAULT_ADVANCED_THEME } from "@/lib/theme-defaults";

describe("theme package v1", () => {
  it("round-trips a valid package", () => {
    const pkg = advancedThemeToPackage(DEFAULT_ADVANCED_THEME);
    const raw = JSON.stringify(pkg);
    const parsed = parseThemePackageV1(raw);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe(DEFAULT_ADVANCED_THEME.name);
      expect(parsed.data.colors.background).toBe(DEFAULT_ADVANCED_THEME.colors.background);
    }
  });

  it("rejects invalid version", () => {
    const parsed = parseThemePackageV1(JSON.stringify({ dexaudioTheme: 2, name: "X", colors: {} }));
    expect(parsed.ok).toBe(false);
  });
});
