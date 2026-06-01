import { describe, expect, it } from "vitest";
import { nearestCuratedId } from "@/lib/theme-migration";
import type { CustomThemePreset } from "@/lib/local-storage";

function preset(colors: CustomThemePreset["colors"]): CustomThemePreset {
  return { id: "x", name: "x", colors };
}

describe("nearestCuratedId", () => {
  it("maps dark neon palette to retrowave", () => {
    const id = nearestCuratedId(
      preset({
        background: "260 35% 8%",
        surface: "260 28% 13%",
        primaryText: "300 15% 96%",
        secondaryText: "260 12% 68%",
        accent: "330 85% 58%",
        nowPlayingHighlight: "195 95% 62%",
      }),
    );
    expect(id).toBe("retrowave");
  });

  it("maps cream palette to warm-tones", () => {
    const id = nearestCuratedId(
      preset({
        background: "35 40% 96%",
        surface: "32 32% 90%",
        primaryText: "25 28% 16%",
        secondaryText: "28 14% 42%",
        accent: "28 92% 50%",
        nowPlayingHighlight: "33 88% 56%",
      }),
    );
    expect(id).toBe("warm-tones");
  });

  it("maps soft gray palette to elegant", () => {
    const id = nearestCuratedId(
      preset({
        background: "220 16% 97%",
        surface: "220 12% 93%",
        primaryText: "222 28% 14%",
        secondaryText: "220 10% 44%",
        accent: "215 22% 32%",
        nowPlayingHighlight: "212 35% 42%",
      }),
    );
    expect(id).toBe("elegant");
  });
});
