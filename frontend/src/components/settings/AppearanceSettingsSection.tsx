import { getThemeMode, setItem, StorageKeys, type ThemeMode } from "@/lib/local-storage";
import { Button } from "@/components/ui/button";
import { CustomThemeEditor } from "./CustomThemeEditor";

const modes: ThemeMode[] = ["sync", "light", "dark", "custom"];

export function AppearanceSettingsSection() {
  const current = getThemeMode();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {modes.map((mode) => (
          <Button
            key={mode}
            variant={current === mode ? "default" : "outline"}
            onClick={() => {
              setItem(StorageKeys.themeMode, mode);
              document.documentElement.setAttribute(
                "data-theme",
                mode === "sync" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode === "custom" ? "dark" : mode,
              );
            }}
          >
            {mode}
          </Button>
        ))}
      </div>
      {current === "custom" && <CustomThemeEditor />}
    </section>
  );
}
