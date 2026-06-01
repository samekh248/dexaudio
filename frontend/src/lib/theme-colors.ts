const HSL_PATTERN = /^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/;

export type HslTriplet = { h: number; s: number; l: number };

export function parseHsl(value: string): HslTriplet | null {
  const trimmed = value.trim();
  const match = HSL_PATTERN.exec(trimmed);
  if (!match) return null;
  const h = Number(match[1]);
  const s = Number(match[2]);
  const l = Number(match[3]);
  if (h > 360 || s > 100 || l > 100) return null;
  return { h, s, l };
}

export function formatHsl({ h, s, l }: HslTriplet): string {
  return `${h} ${s}% ${l}%`;
}

export function isValidHslString(value: string): boolean {
  return parseHsl(value) !== null;
}

/** Tailwind-style HSL components → CSS `hsl()` for inline previews */
export function hslCss(components: string): string {
  return `hsl(${components})`;
}

/**
 * Pick the more readable of two HSL candidates for text on `backgroundComponents`.
 * Candidates are typically primaryText and background (either may be the light or dark tone).
 */
export function contrastingTextOn(
  backgroundComponents: string,
  candidateA: string,
  candidateB: string,
): string {
  const bg = parseHsl(backgroundComponents);
  const a = parseHsl(candidateA);
  const b = parseHsl(candidateB);
  if (!bg || !a || !b) return candidateB;

  if (bg.l < 50) {
    return a.l >= b.l ? candidateA : candidateB;
  }
  return a.l <= b.l ? candidateA : candidateB;
}

export function areThemeColorsValid(colors: Record<string, string>): boolean {
  return Object.values(colors).every((v) => isValidHslString(v));
}

/** #rrggbb or #rgb → HSL components string */
export function hexToHsl(hex: string): string | null {
  const raw = hex.trim().replace(/^#/, "");
  let r: number;
  let g: number;
  let b: number;
  if (raw.length === 3) {
    r = parseInt(raw[0] + raw[0], 16);
    g = parseInt(raw[1] + raw[1], 16);
    b = parseInt(raw[2] + raw[2], 16);
  } else if (raw.length === 6) {
    r = parseInt(raw.slice(0, 2), 16);
    g = parseInt(raw.slice(2, 4), 16);
    b = parseInt(raw.slice(4, 6), 16);
  } else {
    return null;
  }
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;

  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return formatHsl({
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  });
}

/** HSL components string → #rrggbb for color inputs */
export function hslToHex(hsl: string): string | null {
  const parsed = parseHsl(hsl);
  if (!parsed) return null;
  const { h, s, l } = parsed;
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hslNorm(hsl: string): [number, number, number] | null {
  const p = parseHsl(hsl);
  if (!p) return null;
  return [p.h / 360, p.s / 100, p.l / 100];
}
