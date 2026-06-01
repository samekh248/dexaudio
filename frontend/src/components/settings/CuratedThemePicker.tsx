import { CURATED_THEMES } from "@/lib/curated-themes";
import type { CuratedThemeId, CustomSelection } from "@/lib/local-storage";
import { hslCss } from "@/lib/theme-colors";
import {
  previewButtonClass,
  themePreviewButtonStyles,
  themePreviewCardStyle,
} from "@/lib/theme-preview-card";
import { useThemeStore } from "@/lib/theme-store";
import { toast } from "@/components/ui/sonner";
import { ThemeCardDuplicateButton } from "./ThemeCardDuplicateButton";

type Props = {
  selection: CustomSelection;
};

export function CuratedThemePicker({ selection }: Props) {
  const applyCurated = useThemeStore((s) => s.applyCurated);
  const duplicateCurated = useThemeStore((s) => s.duplicateCurated);
  const canAdd = useThemeStore((s) => s.canAddAdvanced());

  const activeCuratedId = selection.kind === "curated" ? selection.id : null;

  const onDuplicate = (id: CuratedThemeId) => {
    const err = duplicateCurated(id);
    if (err) toast(err);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Curated themes</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        {CURATED_THEMES.map((theme) => {
          const selected = activeCuratedId === theme.id;
          const { colors } = theme;
          return (
            <div
              key={theme.id}
              className="rounded-lg border p-3 space-y-2"
              style={{
                ...themePreviewCardStyle(colors, selected),
                boxShadow: selected ? `0 0 0 2px ${hslCss(colors.accent)}` : undefined,
              }}
            >
              <div className="flex gap-1.5" aria-hidden>
                <span
                  className="h-9 flex-1 rounded-md border border-black/10"
                  style={{ backgroundColor: hslCss(colors.surface) }}
                />
                <span
                  className="h-9 w-9 shrink-0 rounded-md border border-black/10"
                  style={{ backgroundColor: hslCss(colors.accent) }}
                />
                <span
                  className="h-9 w-9 shrink-0 rounded-md border border-black/10"
                  style={{ backgroundColor: hslCss(colors.nowPlayingHighlight) }}
                />
              </div>
              <div>
                <p className="font-medium text-sm">{theme.name}</p>
                <p className="text-xs" style={{ color: hslCss(colors.secondaryText) }}>
                  {theme.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={previewButtonClass}
                  style={themePreviewButtonStyles(colors, selected ? "apply-selected" : "apply-idle")}
                  onClick={() => applyCurated(theme.id)}
                  aria-pressed={selected}
                >
                  {selected ? "Active" : "Apply"}
                </button>
                <ThemeCardDuplicateButton
                  colors={colors}
                  disabled={!canAdd}
                  title={canAdd ? "Duplicate theme" : "Maximum advanced themes reached"}
                  onClick={() => onDuplicate(theme.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
