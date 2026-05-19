import { describe, expect, it } from "vitest";

/** Pure sort mirror of selectLeastRecentlyShown ordering for unit tests without DB. */
function pickOldest(
  eligible: string[],
  lastShown: Map<string, Date>,
  limit: number,
): string[] {
  return [...eligible]
    .sort((a, b) => {
      const aTime = lastShown.get(a);
      const bTime = lastShown.get(b);
      if (!aTime && !bTime) return a.localeCompare(b);
      if (!aTime) return -1;
      if (!bTime) return 1;
      const diff = aTime.getTime() - bTime.getTime();
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    })
    .slice(0, limit);
}

describe("artist spotlight round-robin ordering", () => {
  it("treats never-shown artists as oldest (NULLS FIRST)", () => {
    const lastShown = new Map<string, Date>([["a", new Date("2026-01-01")]]);
    const picked = pickOldest(["a", "b", "c"], lastShown, 2);
    expect(picked[0]).toBe("b");
    expect(picked[1]).toBe("c");
  });

  it("tie-breaks by artist_id ascending", () => {
    const t = new Date("2026-01-01");
    const lastShown = new Map([
      ["z", t],
      ["a", t],
    ]);
    const picked = pickOldest(["z", "a"], lastShown, 2);
    expect(picked).toEqual(["a", "z"]);
  });
});
