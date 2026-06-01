import { describe, expect, it } from "vitest";
import { contrastingTextOn } from "@/lib/theme-colors";

describe("contrastingTextOn", () => {
  it("uses light primaryText on dark retrowave surface", () => {
    const text = contrastingTextOn(
      "260 28% 13%",
      "300 15% 96%",
      "260 35% 8%",
    );
    expect(text).toBe("300 15% 96%");
  });

  it("uses dark primaryText on warm orange accent", () => {
    const text = contrastingTextOn(
      "28 92% 50%",
      "25 28% 16%",
      "35 40% 96%",
    );
    expect(text).toBe("25 28% 16%");
  });

  it("uses dark primaryText on light warm surface", () => {
    const text = contrastingTextOn(
      "32 32% 90%",
      "25 28% 16%",
      "35 40% 96%",
    );
    expect(text).toBe("25 28% 16%");
  });
});
