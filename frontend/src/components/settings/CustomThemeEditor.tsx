import type { ThemeColorSlots } from "@/lib/local-storage";
import { useThemeStore } from "@/lib/theme-store";
import { hslToHex, hexToHsl, isValidHslString } from "@/lib/theme-colors";
import { downloadThemePackage } from "@/lib/theme-package";
import { sanitizeSupplementaryRules } from "@/lib/theme-supplementary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

const SLOT_LABELS: Record<keyof ThemeColorSlots, string> = {
  background: "Background",
  surface: "Surface",
  primaryText: "Primary Text",
  secondaryText: "Secondary Text",
  accent: "Accent",
  nowPlayingHighlight: "Now-Playing Highlight",
};

/** Advanced theme settings — visible only after Edit on a theme card. */
export function CustomThemeEditor() {
  const advancedThemes = useThemeStore((s) => s.advancedThemes);
  const editorOpen = useThemeStore((s) => s.editorOpen);
  const draft = useThemeStore((s) => s.draft);
  const dirty = useThemeStore((s) => s.dirty);

  const updateDraft = useThemeStore((s) => s.updateDraft);
  const resetDraft = useThemeStore((s) => s.resetDraft);
  const saveDraft = useThemeStore((s) => s.saveDraft);
  const deleteAdvanced = useThemeStore((s) => s.deleteAdvanced);
  const closeEditor = useThemeStore((s) => s.closeEditor);

  if (!editorOpen || !draft) {
    return null;
  }

  const onExport = () => {
    const theme = advancedThemes.find((t) => t.id === draft.id);
    if (!theme) return;
    downloadThemePackage(theme);
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold">Edit theme</h3>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
          <Button variant="ghost" size="sm" onClick={() => closeEditor()}>
            Close
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="theme-name">Theme name</Label>
        <Input
          id="theme-name"
          value={draft.name}
          onChange={(e) => updateDraft((d) => ({ ...d, name: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(SLOT_LABELS) as Array<keyof ThemeColorSlots>).map((key) => (
          <ColorSlotField
            key={key}
            label={SLOT_LABELS[key]}
            value={draft.colors[key]}
            onChange={(value) => {
              updateDraft((d) => ({
                ...d,
                colors: { ...d.colors, [key]: value },
              }));
            }}
          />
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplementary-rules">Supplementary rules (optional)</Label>
        <textarea
          id="supplementary-rules"
          className="flex min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={draft.supplementaryRules ?? ""}
          onChange={(e) => {
            updateDraft((d) => ({ ...d, supplementaryRules: e.target.value }));
          }}
          onBlur={() => {
            const raw = draft.supplementaryRules ?? "";
            const result = sanitizeSupplementaryRules(raw);
            if (!result.ok) {
              toast(result.error);
              return;
            }
            if (result.stripped) {
              toast("Some rules were removed (disallowed selectors or content).");
            }
            updateDraft((d) => ({ ...d, supplementaryRules: result.ok ? result.css : "" }));
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            const err = saveDraft();
            if (err) toast(err);
          }}
        >
          Save
        </Button>
        <Button variant="outline" onClick={resetDraft} disabled={!dirty}>
          Reset
        </Button>
        <Button variant="outline" onClick={onExport}>
          Export
        </Button>
        <Button
          variant="outline"
          disabled={advancedThemes.length <= 1}
          onClick={() => {
            if (!window.confirm(`Delete "${draft.name}"?`)) return;
            const err = deleteAdvanced(draft.id);
            if (err) toast(err);
          }}
        >
          Delete theme
        </Button>
      </div>
    </div>
  );
}

function ColorSlotField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hsl: string) => void;
}) {
  const hex = hslToHex(value) ?? "#000000";
  const invalid = !isValidHslString(value);

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={hex}
          aria-label={`${label} color picker`}
          onChange={(e) => {
            const hsl = hexToHsl(e.target.value);
            if (hsl) onChange(hsl);
          }}
          className="h-10 w-12 cursor-pointer rounded border border-border bg-transparent"
        />
        <Input
          value={value}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value)}
          className={invalid ? "border-destructive" : undefined}
        />
      </div>
      {invalid && <p className="text-xs text-destructive">Use format: H S% L%</p>}
    </div>
  );
}
