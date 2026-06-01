import type { CuratedThemeId, ThemeColorSlots } from "@/lib/local-storage";

export type CuratedThemeDefinition = {
  id: CuratedThemeId;
  name: string;
  description: string;
  colors: ThemeColorSlots;
};

export const CURATED_THEMES: CuratedThemeDefinition[] = [
  {
    id: "warm-tones",
    name: "Warmth of the Sun",
    description: "Light creams and beiges with a sunlit orange accent",
    colors: {
      background: "35 40% 96%",
      surface: "32 32% 90%",
      primaryText: "25 28% 16%",
      secondaryText: "28 14% 42%",
      accent: "28 92% 50%",
      nowPlayingHighlight: "33 88% 56%",
    },
  },
  {
    id: "retrowave",
    name: "Retrowave",
    description: "Dark base with vivid pink and blue accents",
    colors: {
      background: "260 35% 8%",
      surface: "260 28% 13%",
      primaryText: "300 15% 96%",
      secondaryText: "260 12% 68%",
      accent: "330 85% 58%",
      nowPlayingHighlight: "195 95% 62%",
    },
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Refined light neutrals with calm contrast",
    colors: {
      background: "220 16% 97%",
      surface: "220 12% 93%",
      primaryText: "222 28% 14%",
      secondaryText: "220 10% 44%",
      accent: "215 22% 32%",
      nowPlayingHighlight: "212 35% 42%",
    },
  },
];

const BY_ID = new Map(CURATED_THEMES.map((t) => [t.id, t]));

export function getCuratedTheme(id: CuratedThemeId): CuratedThemeDefinition {
  const theme = BY_ID.get(id);
  if (!theme) throw new Error(`Unknown curated theme: ${id}`);
  return theme;
}
