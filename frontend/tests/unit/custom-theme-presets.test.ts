import { describe, expect, it } from "vitest";
import { canDeletePreset } from "@/lib/custom-theme-presets";
import { DEFAULT_CUSTOM_PRESET } from "@/lib/custom-theme-presets";

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
});
