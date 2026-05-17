import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  applyCustomPreset,
  canDeletePreset,
  DEFAULT_CUSTOM_PRESET,
} from "@/lib/custom-theme-presets";
import { getCustomPresets, setItem, StorageKeys, type CustomThemePreset } from "@/lib/local-storage";

export function CustomThemeEditor() {
  const [presets, setPresets] = useState<CustomThemePreset[]>(
    getCustomPresets().length ? getCustomPresets() : [DEFAULT_CUSTOM_PRESET],
  );
  const [active, setActive] = useState(presets[0]);

  const save = () => {
    setItem(StorageKeys.customPresets, presets);
    applyCustomPreset(active);
    setItem(StorageKeys.themeMode, "custom");
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-4 max-w-lg">
      <h3 className="font-semibold">Custom theme presets</h3>
      <div className="flex gap-2 flex-wrap">
        {presets.map((p) => (
          <Button key={p.id} size="sm" variant={active.id === p.id ? "default" : "outline"} onClick={() => { setActive(p); applyCustomPreset(p); }}>
            {p.name}
          </Button>
        ))}
      </div>
      <Input
        value={active.name}
        onChange={(e) => {
          const next = presets.map((p) => (p.id === active.id ? { ...p, name: e.target.value } : p));
          setPresets(next);
          setActive({ ...active, name: e.target.value });
        }}
      />
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(active.colors) as Array<keyof typeof active.colors>).map((key) => (
          <label key={key} className="text-xs space-y-1">
            {key}
            <Input
              value={active.colors[key]}
              onChange={(e) => {
                const colors = { ...active.colors, [key]: e.target.value };
                const updated = { ...active, colors };
                setActive(updated);
                setPresets(presets.map((p) => (p.id === active.id ? updated : p)));
                applyCustomPreset(updated);
              }}
            />
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={save}>Save preset</Button>
        <Button
          variant="outline"
          disabled={!canDeletePreset(presets)}
          onClick={() => {
            if (!canDeletePreset(presets)) return;
            const next = presets.filter((p) => p.id !== active.id);
            setPresets(next);
            setActive(next[0]);
          }}
        >
          Delete preset
        </Button>
      </div>
    </div>
  );
}
