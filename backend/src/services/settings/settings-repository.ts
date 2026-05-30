import { eq } from "drizzle-orm";
import type { AppSettings } from "@dexaudio/shared-types";
import type { getDb } from "../../db/index.js";
import { appSettings } from "../../db/schema.js";

type Db = ReturnType<typeof getDb>;

const DEFAULTS: AppSettings = {
  matchingStrictness: "fuzzy",
  libraryRefreshPolicy: "on_launch",
  autoQueueSimilar: true,
  crossfade: { enabled: false, durationSec: 3 },
  plexPlaybackReporting: { enabled: true },
};

export async function getSettings(db: Db): Promise<AppSettings> {
  const rows = await db.select().from(appSettings);
  const merged = { ...DEFAULTS };
  for (const row of rows) {
    const key = row.key as keyof AppSettings;
    if (key in merged) {
      (merged as Record<string, unknown>)[key] = row.value;
    }
  }
  return merged;
}

export async function patchSettings(db: Db, patch: Partial<AppSettings>): Promise<AppSettings> {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value },
      });
  }
  return getSettings(db);
}
