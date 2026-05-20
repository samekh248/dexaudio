import { describe, expect, it } from "vitest";
import { buildGaplessSlots } from "@/lib/gapless-cache-slots";

describe("buildGaplessSlots", () => {
  it("orders next, previous, second-ahead, two-behind", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const slots = buildGaplessSlots(5, 2, ids);
    expect(slots.map((s) => s.priority)).toEqual([1, 2, 3, 4]);
    expect(slots.map((s) => s.queueIndex)).toEqual([3, 1, 4, 0]);
    expect(slots.map((s) => s.trackId)).toEqual(["d", "b", "e", "a"]);
  });

  it("skips invalid indices at queue edges", () => {
    const slots = buildGaplessSlots(2, 0, ["a", "b"]);
    expect(slots.map((s) => s.priority)).toEqual([1]);
    expect(slots.map((s) => s.trackId)).toEqual(["b"]);
  });
});
