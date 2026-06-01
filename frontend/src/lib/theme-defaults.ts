import type { AdvancedTheme } from "@/lib/local-storage";

const BASE_COLORS = {
  background: "222 47% 6%",
  surface: "222 47% 9%",
  primaryText: "210 40% 98%",
  secondaryText: "215 20% 65%",
  accent: "217 33% 17%",
  nowPlayingHighlight: "210 40% 98%",
} as const;

/** Stable default used in tests and initial seed */
export const DEFAULT_ADVANCED_THEME: AdvancedTheme = {
  id: "default",
  name: "Default",
  colors: { ...BASE_COLORS },
  supplementaryRules: "",
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z",
};

export function createDefaultAdvancedTheme(): AdvancedTheme {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "My theme",
    colors: { ...BASE_COLORS },
    supplementaryRules: "",
    createdAt: now,
    updatedAt: now,
  };
}
