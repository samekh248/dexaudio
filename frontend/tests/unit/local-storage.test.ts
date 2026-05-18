import { describe, expect, it, beforeEach } from "vitest";
import { getItem, setItem, StorageKeys } from "@/lib/local-storage";

describe("localStorage helpers", () => {
  beforeEach(() => localStorage.clear());

  it("returns fallback when key missing", () => {
    expect(getItem(StorageKeys.themeMode, "light")).toBe("light");
  });

  it("round-trips JSON values", () => {
    setItem(StorageKeys.autoQueueSimilar, false);
    expect(getItem(StorageKeys.autoQueueSimilar, true)).toBe(false);
  });
});
