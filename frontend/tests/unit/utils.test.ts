import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("merges class names", () => {
    expect(cn("foo", false && "bar", "baz")).toContain("foo");
    expect(cn("foo", "baz")).toContain("baz");
  });
});
