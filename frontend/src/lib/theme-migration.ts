import { getCuratedTheme, CURATED_THEMES } from "@/lib/curated-themes";
import { hslNorm } from "@/lib/theme-colors";
import {
  getCustomPresets,
  getItem,
  removeItem,
  setItem,
  StorageKeys,
  type CuratedThemeId,
  type CustomThemePreset,
} from "@/lib/local-storage";
import { createDefaultAdvancedTheme } from "@/lib/theme-defaults";

const TIE_ORDER: CuratedThemeId[] = ["warm-tones", "elegant", "retrowave"];

function dist3(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function presetDistance(preset: CustomThemePreset, curatedId: CuratedThemeId): number {
  const curated = getCuratedTheme(curatedId).colors;
  const keys = ["background", "surface", "accent"] as const;
  let sum = 0;
  for (const key of keys) {
    const pa = hslNorm(preset.colors[key]);
    const pb = hslNorm(curated[key]);
    if (!pa || !pb) return Number.POSITIVE_INFINITY;
    sum += dist3(pa, pb);
  }
  return sum;
}

export function nearestCuratedId(preset: CustomThemePreset): CuratedThemeId {
  let best: CuratedThemeId = "warm-tones";
  let bestDist = Number.POSITIVE_INFINITY;
  for (const curated of CURATED_THEMES) {
    const d = presetDistance(preset, curated.id);
    if (d < bestDist) {
      bestDist = d;
      best = curated.id;
      continue;
    }
    if (d === bestDist) {
      const bestIdx = TIE_ORDER.indexOf(best);
      const candIdx = TIE_ORDER.indexOf(curated.id);
      if (candIdx < bestIdx) best = curated.id;
    }
  }
  return best;
}

export type ThemeMigrationResult = {
  ran: boolean;
  notice: string | null;
};

export function runThemeMigration(): ThemeMigrationResult {
  if (getItem(StorageKeys.themeMigrationV1, false)) {
    return { ran: false, notice: null };
  }

  const legacy = getCustomPresets();
  if (legacy.length === 0) {
    setItem(StorageKeys.themeMigrationV1, true);
    return { ran: false, notice: null };
  }

  const activeId = getItem<string | null>(StorageKeys.customPresetId, null);
  const active =
    legacy.find((p) => p.id === activeId) ?? legacy[0];

  const curatedId = nearestCuratedId(active);
  const curatedName = getCuratedTheme(curatedId).name;

  setItem(StorageKeys.themeMode, "custom");
  setItem(StorageKeys.customSelection, { kind: "curated", id: curatedId });
  setItem(StorageKeys.themeMigrationV1, true);
  removeItem(StorageKeys.customPresets);
  removeItem(StorageKeys.customPresetId);
  setItem(StorageKeys.customPresets, [createDefaultAdvancedTheme()]);

  return {
    ran: true,
    notice: `Your previous custom colors were mapped to ${curatedName}. Duplicate a curated theme to customize again.`,
  };
}
