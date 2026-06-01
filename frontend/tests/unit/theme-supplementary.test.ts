import { describe, expect, it } from "vitest";
import { sanitizeSupplementaryRules } from "@/lib/theme-supplementary";

describe("sanitizeSupplementaryRules", () => {
  it("allows :root rules", () => {
    const result = sanitizeSupplementaryRules(":root { --radius: 0.75rem; }");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.css).toContain("--radius");
  });

  it("blocks @import", () => {
    const result = sanitizeSupplementaryRules('@import url("x.css");');
    expect(result.ok).toBe(false);
  });
});
