import { applyAdvancedTheme } from "@/lib/theme-engine";
import { DEFAULT_ADVANCED_THEME } from "@/lib/theme-defaults";
import type { AdvancedTheme, CustomThemePreset } from "@/lib/local-storage";

/** @deprecated Use theme-store */
export function canDeletePreset(presets: readonly unknown[]): boolean {
  return presets.length > 1;
}

/** @deprecated Use applyAdvancedTheme */
export function applyCustomPreset(preset: CustomThemePreset | AdvancedTheme): void {
  const theme: AdvancedTheme =
    "createdAt" in preset
      ? preset
      : {
          id: preset.id,
          name: preset.name,
          colors: preset.colors,
          supplementaryRules: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
  applyAdvancedTheme(theme);
}

/** @deprecated Use DEFAULT_ADVANCED_THEME */
export const DEFAULT_CUSTOM_PRESET = DEFAULT_ADVANCED_THEME;
