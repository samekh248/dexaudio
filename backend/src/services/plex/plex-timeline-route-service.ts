import type { PlexTimelineInput } from "@dexaudio/shared-types";
import type { getDb } from "../../db/index.js";
import * as plexConnection from "./plex-connection-service.js";
import * as outbox from "./plex-timeline-outbox.js";
import { reportTimeline } from "./plex-timeline-service.js";
import * as settingsRepo from "../settings/settings-repository.js";

type Db = ReturnType<typeof getDb>;

export async function submitTimeline(
  db: Db,
  appSecret: string,
  input: PlexTimelineInput,
): Promise<{ status: 204 } | { status: 202; queued: true } | { status: 401; message: string }> {
  const settings = await settingsRepo.getSettings(db);
  if (settings.plexPlaybackReporting?.enabled === false) {
    return { status: 204 };
  }

  const config = await plexConnection.getPlexConfig(db, appSecret, { validate: false });
  if (!config) {
    return { status: 401, message: "Plex not connected" };
  }

  const result = await reportTimeline(config, input);
  if (result.ok) {
    return { status: 204 };
  }

  try {
    await outbox.enqueueTimeline(db, input, result.error);
    return { status: 202, queued: true };
  } catch {
    return { status: 204 };
  }
}

export async function getReportingStatus(db: Db, appSecret: string) {
  const settings = await settingsRepo.getSettings(db);
  const publicConn = await plexConnection.getConnectionPublic(db, appSecret);
  let pending = 0;
  let lastError: string | null = null;
  try {
    pending = await outbox.getPendingCount(db);
    lastError = await outbox.getLatestError(db);
  } catch {
    // Outbox table may be missing before migration is applied.
  }
  return {
    enabled: settings.plexPlaybackReporting?.enabled !== false,
    connected: publicConn.connected,
    pending,
    lastError,
  };
}

export async function retryReporting(db: Db, appSecret: string) {
  const config = await plexConnection.getPlexConfig(db, appSecret, { validate: false });
  if (!config) {
    await outbox.dropExpired(db).catch(() => undefined);
    return { status: "retry_initiated" as const, pending: await outbox.getPendingCount(db).catch(() => 0) };
  }
  const { pending } = await outbox.flushPending(db, config);
  return { status: "retry_initiated" as const, pending };
}
