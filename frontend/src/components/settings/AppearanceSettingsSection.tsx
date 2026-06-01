import { useEffect } from "react";
import type { ThemeMode } from "@/lib/local-storage";
import { useThemeStore } from "@/lib/theme-store";
import { Button } from "@/components/ui/button";
import { AdvancedThemePicker } from "./AdvancedThemePicker";
import { CustomThemeEditor } from "./CustomThemeEditor";
import { CuratedThemePicker } from "./CuratedThemePicker";
import { toast } from "@/components/ui/sonner";

const modes: ThemeMode[] = ["sync", "light", "dark", "custom"];

export function AppearanceSettingsSection() {
  const themeMode = useThemeStore((s) => s.themeMode);
  const customSelection = useThemeStore((s) => s.customSelection);
  const migrationNotice = useThemeStore((s) => s.migrationNotice);
  const applyMode = useThemeStore((s) => s.applyMode);
  const clearMigrationNotice = useThemeStore((s) => s.clearMigrationNotice);

  useEffect(() => {
    if (migrationNotice) {
      toast(migrationNotice);
      clearMigrationNotice();
    }
  }, [migrationNotice, clearMigrationNotice]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {modes.map((mode) => (
          <Button
            key={mode}
            variant={themeMode === mode ? "default" : "outline"}
            onClick={() => {
              applyMode(mode);
            }}
          >
            {mode}
          </Button>
        ))}
      </div>
      {themeMode === "custom" && (
        <>
          <CuratedThemePicker selection={customSelection} />
          <AdvancedThemePicker selection={customSelection} />
          <CustomThemeEditor />
        </>
      )}
    </section>
  );
}
