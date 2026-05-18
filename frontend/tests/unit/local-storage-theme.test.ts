import { describe, expect, it, beforeEach } from "vitest";
import { getCustomPresets, getThemeMode, StorageKeys, setItem } from "@/lib/local-storage";

describe("theme localStorage", () => {
  beforeEach(() => localStorage.clear());

  it("reads theme mode default", () => {
    expect(getThemeMode()).toBe("sync");
  });

  it("reads custom presets", () => {
    setItem(StorageKeys.customPresets, [{ id: "1", name: "A", colors: {} as never }]);
    expect(getCustomPresets()).toHaveLength(1);
  });
});
