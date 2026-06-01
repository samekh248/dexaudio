import { useRef } from "react";
import { Plus } from "lucide-react";
import type { AdvancedTheme, CustomSelection } from "@/lib/local-storage";
import { hslCss } from "@/lib/theme-colors";
import {
  previewButtonClass,
  themePreviewButtonStyles,
  themePreviewCardStyle,
} from "@/lib/theme-preview-card";
import { parseThemePackageV1 } from "@/lib/theme-package";
import { useThemeStore } from "@/lib/theme-store";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ThemeCardDuplicateButton } from "./ThemeCardDuplicateButton";

const cardMinHeight = "min-h-[11.5rem]";

type Props = {
  selection: CustomSelection;
};

export function AdvancedThemePicker({ selection }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const advancedThemes = useThemeStore((s) => s.advancedThemes);
  const canAdd = useThemeStore((s) => s.canAddAdvanced());
  const selectAdvanced = useThemeStore((s) => s.selectAdvanced);
  const editAdvanced = useThemeStore((s) => s.editAdvanced);
  const duplicateAdvanced = useThemeStore((s) => s.duplicateAdvanced);
  const startCreateAdvanced = useThemeStore((s) => s.startCreateAdvanced);
  const importPackage = useThemeStore((s) => s.importPackage);

  const activeAdvancedId = selection.kind === "advanced" ? selection.id : null;

  const onImportFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseThemePackageV1(text);
    if (!parsed.ok) {
      toast(parsed.error);
      return;
    }

    const collision = advancedThemes.find(
      (t) => t.name.toLowerCase() === parsed.data.name.toLowerCase(),
    );

    if (collision) {
      const replace = window.confirm(
        `Theme "${parsed.data.name}" already exists. Replace "${collision.name}"? Cancel to abort.`,
      );
      if (!replace) {
        const rename = window.prompt("Import as new name:", `${parsed.data.name} (imported)`);
        if (!rename?.trim()) return;
        parsed.data.name = rename.trim();
        const err = importPackage(parsed.data, "add");
        if (err) toast(err);
        else toast("Theme imported.");
        return;
      }
      const err = importPackage(parsed.data, "replace", collision.id);
      if (err) toast(err);
      else toast("Theme replaced.");
      return;
    }

    const err = importPackage(parsed.data, "add");
    if (err) toast(err);
    else toast("Theme imported.");
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Advanced themes</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        {advancedThemes.map((theme) => (
          <AdvancedThemeCard
            key={theme.id}
            theme={theme}
            selected={activeAdvancedId === theme.id}
            canDuplicate={canAdd}
            onApply={() => selectAdvanced(theme.id)}
            onDuplicate={() => {
              const err = duplicateAdvanced(theme.id);
              if (err) toast(err);
            }}
            onEdit={() => editAdvanced(theme.id)}
          />
        ))}
        <button
          type="button"
          className={`rounded-lg border border-dashed border-border bg-muted/30 ${cardMinHeight} flex w-full items-center justify-center transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40`}
          disabled={!canAdd}
          onClick={() => {
            if (!startCreateAdvanced()) {
              toast("Maximum of 6 advanced themes reached. Delete one first.");
            }
          }}
          aria-label="Add new advanced theme"
        >
          <Plus className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      <Button variant="outline" type="button" onClick={() => fileRef.current?.click()}>
        Import theme
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onImportFile(file);
        }}
      />
    </div>
  );
}

function AdvancedThemeCard({
  theme,
  selected,
  canDuplicate,
  onApply,
  onDuplicate,
  onEdit,
}: {
  theme: AdvancedTheme;
  selected: boolean;
  canDuplicate: boolean;
  onApply: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
}) {
  const { colors } = theme;
  return (
    <div
      className={`rounded-lg border p-3 space-y-2 flex flex-col ${cardMinHeight}`}
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
      <div className="flex-1">
        <p className="font-medium text-sm">{theme.name}</p>
      </div>
      <div className="flex items-center gap-2 mt-auto">
        <button
          type="button"
          className={previewButtonClass}
          style={themePreviewButtonStyles(colors, selected ? "apply-selected" : "apply-idle")}
          onClick={onApply}
          aria-pressed={selected}
        >
          {selected ? "Active" : "Apply"}
        </button>
        <button
          type="button"
          className={previewButtonClass}
          style={themePreviewButtonStyles(colors, "edit")}
          onClick={onEdit}
        >
          Edit
        </button>
        <ThemeCardDuplicateButton
          colors={colors}
          disabled={!canDuplicate}
          title={canDuplicate ? "Duplicate theme" : "Maximum advanced themes reached"}
          onClick={onDuplicate}
        />
      </div>
    </div>
  );
}
