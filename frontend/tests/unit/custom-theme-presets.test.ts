import { describe, expect, it, vi } from "vitest";
import { applyCustomPreset, canDeletePreset, DEFAULT_CUSTOM_PRESET } from "@/lib/custom-theme-presets";
import * as themeEngine from "@/lib/theme-engine";

vi.mock("@/lib/theme-engine", () => ({
  applyAdvancedTheme: vi.fn(),
}));

describe("custom theme presets", () => {
  it("requires at least one preset", () => {
    expect(canDeletePreset([DEFAULT_CUSTOM_PRESET])).toBe(false);
    expect(
      canDeletePreset([
        DEFAULT_CUSTOM_PRESET,
        { ...DEFAULT_CUSTOM_PRESET, id: "2", name: "Alt" },
      ]),
    ).toBe(true);
  });

  it("applyCustomPreset forwards advanced and legacy presets", () => {
    applyCustomPreset(DEFAULT_CUSTOM_PRESET);
    applyCustomPreset({
      id: "legacy",
      name: "Legacy",
      colors: DEFAULT_CUSTOM_PRESET.colors,
    });
    expect(themeEngine.applyAdvancedTheme).toHaveBeenCalledTimes(2);
  });
});
