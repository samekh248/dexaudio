import { desc, eq, lt } from "drizzle-orm";
import type { PlexTimelineInput } from "@dexaudio/shared-types";
import type { getDb } from "../../db/index.js";
import { plexTimelineOutbox } from "../../db/schema.js";
import type { PlexConfig } from "./plex-client.js";
import { reportTimeline } from "./plex-timeline-service.js";

type Db = ReturnType<typeof getDb>;

const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function enqueueTimeline(db: Db, input: PlexTimelineInput, lastError: string) {
  const expiresAt = new Date(Date.now() + RETRY_WINDOW_MS);
  await db.insert(plexTimelineOutbox).values({
    payload: input,
    expiresAt,
    status: "pending",
    lastError,
  });
}

export async function getPendingCount(db: Db): Promise<number> {
  const rows = await db
    .select({ id: plexTimelineOutbox.id })
    .from(plexTimelineOutbox)
    .where(eq(plexTimelineOutbox.status, "pending"));
  return rows.length;
}

export async function getLatestError(db: Db): Promise<string | null> {
  const rows = await db
    .select({ lastError: plexTimelineOutbox.lastError })
    .from(plexTimelineOutbox)
    .where(eq(plexTimelineOutbox.status, "pending"))
    .orderBy(desc(plexTimelineOutbox.createdAt))
    .limit(1);
  return rows[0]?.lastError ?? null;
}

export async function dropExpired(db: Db) {
  await db
    .update(plexTimelineOutbox)
    .set({ status: "dropped" })
    .where(lt(plexTimelineOutbox.expiresAt, new Date()));
}

export async function flushPending(
  db: Db,
  config: PlexConfig,
): Promise<{ delivered: number; pending: number }> {
  await dropExpired(db);
  const rows = await db
    .select()
    .from(plexTimelineOutbox)
    .where(eq(plexTimelineOutbox.status, "pending"))
    .orderBy(plexTimelineOutbox.createdAt);

  let delivered = 0;
  for (const row of rows) {
    const input = row.payload as PlexTimelineInput;
    const result = await reportTimeline(config, input);
    if (result.ok) {
      await db.delete(plexTimelineOutbox).where(eq(plexTimelineOutbox.id, row.id));
      delivered += 1;
    } else {
      await db
        .update(plexTimelineOutbox)
        .set({
          retryCount: row.retryCount + 1,
          lastError: result.error,
        })
        .where(eq(plexTimelineOutbox.id, row.id));
    }
  }

  return { delivered, pending: await getPendingCount(db) };
}
