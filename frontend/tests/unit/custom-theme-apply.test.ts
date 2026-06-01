import { describe, expect, it } from "vitest";
import { applyAdvancedTheme, applyCuratedTheme } from "@/lib/theme-engine";
import { DEFAULT_ADVANCED_THEME } from "@/lib/theme-defaults";

describe("applyAdvancedTheme", () => {
  it("sets CSS variables on document root", () => {
    applyAdvancedTheme(DEFAULT_ADVANCED_THEME);
    expect(document.documentElement.style.getPropertyValue("--background")).toBe(
      DEFAULT_ADVANCED_THEME.colors.background,
    );
    expect(document.documentElement.style.getPropertyValue("--now-playing-highlight")).toBe(
      DEFAULT_ADVANCED_THEME.colors.nowPlayingHighlight,
    );
  });
});

describe("applyCuratedTheme", () => {
  it("uses dark accent-foreground on Warmth of the Sun orange accent", () => {
    applyCuratedTheme("warm-tones");
    expect(document.documentElement.style.getPropertyValue("--accent-foreground")).toBe(
      "25 28% 16%",
    );
  });
});
