import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getPlayNavigationMode, StorageKeys, setItem, removeItem } from "@/lib/local-storage";

describe("getPlayNavigationMode", () => {
  beforeEach(() => {
    removeItem(StorageKeys.playNavigation);
  });

  afterEach(() => {
    removeItem(StorageKeys.playNavigation);
  });

  it("defaults to navigate when key is missing", () => {
    expect(getPlayNavigationMode()).toBe("navigate");
  });

  it("returns stay when stored", () => {
    setItem(StorageKeys.playNavigation, "stay");
    expect(getPlayNavigationMode()).toBe("stay");
  });

  it("falls back to navigate for invalid stored values", () => {
    setItem(StorageKeys.playNavigation, "invalid");
    expect(getPlayNavigationMode()).toBe("navigate");
  });
});
