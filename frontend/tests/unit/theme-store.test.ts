import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ADVANCED_THEME } from "@/lib/theme-defaults";
import { useThemeStore } from "@/lib/theme-store";
import { StorageKeys, setItem, type AdvancedTheme } from "@/lib/local-storage";

function seedTwoThemes(): [AdvancedTheme, AdvancedTheme] {
  const a: AdvancedTheme = { ...DEFAULT_ADVANCED_THEME, id: "a", name: "A" };
  const b: AdvancedTheme = { ...DEFAULT_ADVANCED_THEME, id: "b", name: "B" };
  setItem(StorageKeys.customPresets, [a, b]);
  return [a, b];
}

describe("theme-store deleteAdvanced", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    useThemeStore.setState({
      themeMode: "sync",
      customSelection: { kind: "curated", id: "warm-tones" },
      advancedThemes: [],
      draft: null,
      savedDraft: null,
      dirty: false,
      editorOpen: false,
      migrationNotice: null,
    });
  });

  it("switches to sync when deleting the active advanced theme", () => {
    const [a, b] = seedTwoThemes();
    useThemeStore.setState({
      themeMode: "custom",
      customSelection: { kind: "advanced", id: a.id },
      advancedThemes: [a, b],
    });
    setItem(StorageKeys.themeMode, "custom");
    setItem(StorageKeys.customSelection, { kind: "advanced", id: a.id });

    const err = useThemeStore.getState().deleteAdvanced(a.id);
    expect(err).toBeNull();
    expect(useThemeStore.getState().themeMode).toBe("sync");
    expect(localStorage.getItem(StorageKeys.themeMode)).toBe(JSON.stringify("sync"));
    expect(useThemeStore.getState().advancedThemes).toHaveLength(1);
    expect(useThemeStore.getState().advancedThemes[0]!.id).toBe(b.id);
  });
});
