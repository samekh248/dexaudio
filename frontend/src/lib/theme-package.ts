import type { AdvancedTheme, ThemeColorSlots } from "@/lib/local-storage";
import { isValidHslString } from "@/lib/theme-colors";
import { sanitizeSupplementaryRules } from "@/lib/theme-supplementary";

const HSL_SLOTS: (keyof ThemeColorSlots)[] = [
  "background",
  "surface",
  "primaryText",
  "secondaryText",
  "accent",
  "nowPlayingHighlight",
];

export type ThemePackageV1 = {
  dexaudioTheme: 1;
  name: string;
  colors: ThemeColorSlots;
  supplementaryRules?: string;
};

export type ThemePackageParseResult =
  | { ok: true; data: ThemePackageV1 }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseThemePackageV1(raw: string): ThemePackageParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON file." };
  }
  if (!isRecord(json)) return { ok: false, error: "Theme package must be a JSON object." };
  if (json.dexaudioTheme !== 1) {
    return { ok: false, error: "Unsupported theme package version." };
  }
  const name = typeof json.name === "string" ? json.name.trim() : "";
  if (!name || name.length > 64) {
    return { ok: false, error: "Theme name must be 1–64 characters." };
  }
  if (!isRecord(json.colors)) {
    return { ok: false, error: "Missing colors object." };
  }
  const colors = {} as ThemeColorSlots;
  for (const key of HSL_SLOTS) {
    const val = json.colors[key];
    if (typeof val !== "string" || !isValidHslString(val)) {
      return { ok: false, error: `Invalid color for ${key}.` };
    }
    colors[key] = val.trim();
  }
  let supplementaryRules: string | undefined;
  if (json.supplementaryRules !== undefined) {
    if (typeof json.supplementaryRules !== "string") {
      return { ok: false, error: "supplementaryRules must be a string." };
    }
    const sanitized = sanitizeSupplementaryRules(json.supplementaryRules);
    if (!sanitized.ok) return { ok: false, error: sanitized.error };
    supplementaryRules = sanitized.css;
  }
  return {
    ok: true,
    data: { dexaudioTheme: 1, name, colors, supplementaryRules },
  };
}

export function advancedThemeToPackage(theme: AdvancedTheme): ThemePackageV1 {
  return {
    dexaudioTheme: 1,
    name: theme.name,
    colors: { ...theme.colors },
    supplementaryRules: theme.supplementaryRules || undefined,
  };
}

export function packageToAdvancedTheme(data: ThemePackageV1, id?: string): AdvancedTheme {
  const now = new Date().toISOString();
  return {
    id: id ?? crypto.randomUUID(),
    name: data.name,
    colors: { ...data.colors },
    supplementaryRules: data.supplementaryRules ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

export function downloadThemePackage(theme: AdvancedTheme): void {
  const pkg = advancedThemeToPackage(theme);
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const slug = theme.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "theme";
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.dexaudio-theme.json`;
  a.click();
  URL.revokeObjectURL(url);
}
