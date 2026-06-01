import type { CSSProperties } from "react";
import type { ThemeColorSlots } from "@/lib/local-storage";
import { contrastingTextOn, hslCss } from "@/lib/theme-colors";

export const previewButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50";

export function themePreviewCardStyle(
  colors: ThemeColorSlots,
  selected: boolean,
): CSSProperties {
  return {
    backgroundColor: hslCss(colors.background),
    color: hslCss(colors.primaryText),
    borderColor: selected ? hslCss(colors.accent) : hslCss(colors.surface),
  };
}

export const previewDuplicateLinkClass =
  "ml-auto inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-md border-0 bg-transparent px-2 text-sm font-medium underline-offset-4 transition-opacity hover:underline hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50";

export function themePreviewDuplicateLinkStyles(colors: ThemeColorSlots): CSSProperties {
  return {
    color: hslCss(colors.accent),
  };
}

export function themePreviewButtonStyles(
  colors: ThemeColorSlots,
  role: "apply-selected" | "apply-idle" | "edit",
): CSSProperties {
  const textCandidates = [colors.primaryText, colors.background] as const;
  const borderOnSurface = contrastingTextOn(colors.surface, colors.primaryText, colors.secondaryText);

  if (role === "apply-selected") {
    return {
      backgroundColor: hslCss(colors.accent),
      color: hslCss(contrastingTextOn(colors.accent, colors.primaryText, colors.background)),
      borderColor: hslCss(colors.accent),
    };
  }
  return {
    backgroundColor: hslCss(colors.surface),
    color: hslCss(contrastingTextOn(colors.surface, ...textCandidates)),
    borderColor: hslCss(borderOnSurface),
  };
}
