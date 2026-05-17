import { describe, expect, it } from "vitest";
import { applyCustomPreset, DEFAULT_CUSTOM_PRESET } from "@/lib/custom-theme-presets";

describe("applyCustomPreset", () => {
  it("sets CSS variables on document root", () => {
    applyCustomPreset(DEFAULT_CUSTOM_PRESET);
    expect(document.documentElement.style.getPropertyValue("--background")).toBe(
      DEFAULT_CUSTOM_PRESET.colors.background,
    );
  });
});
