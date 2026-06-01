import type { FastifyInstance } from "fastify";
import * as syncService from "../services/lastfm/lastfm-sync-service.js";
import * as outbox from "../services/lastfm/scrobble-outbox.js";

const INTERVAL_MS = 15 * 60 * 1000;

export function startLastfmSyncScheduler(app: FastifyInstance) {
  void syncService
    .recoverInterruptedSync(app.db, app.config.LASTFM_API_KEY)
    .catch((err) => app.log.error(err, "lastfm sync recovery failed"));

  const tick = async () => {
    // Retry any pending outbound scrobbles regardless of read-sync state.
    await outbox
      .flushPending(app.db, {
        apiKey: app.config.LASTFM_API_KEY,
        apiSecret: app.config.LASTFM_API_SECRET,
        appSecret: app.config.APP_SECRET,
      })
      .catch((err) => app.log.error(err, "lastfm scrobble flush failed"));

    const apiKey = app.config.LASTFM_API_KEY;
    if (!apiKey) return;

    let account = await syncService.getAccount(app.db);
    if (!account?.connected || !account.username) return;

    if (account.syncStatus === "syncing") {
      const timedOut = await syncService.recoverStaleSync(app.db);
      if (!timedOut) return;
      account = await syncService.getAccount(app.db);
      if (!account?.connected || !account.username) return;
    }

    if (account.syncStatus === "error") {
      const incompleteBackfill =
        account.totalPages != null &&
        account.totalPages > 0 &&
        account.syncedPages < account.totalPages;
      if (incompleteBackfill) {
        syncService.triggerBackfill(app.db, apiKey, account.id, account.username);
        return;
      }

      await syncService.runIncrementalSync(
        app.db,
        apiKey,
        account.id,
        account.username,
        account.lastSyncedAt,
      );
      return;
    }

    if (account.syncStatus !== "idle") return;

    await syncService.runIncrementalSync(
      app.db,
      apiKey,
      account.id,
      account.username,
      account.lastSyncedAt,
    );
  };

  void tick();

  const timer = setInterval(() => {
    void tick();
  }, INTERVAL_MS);

  app.addHook("onClose", async () => {
    clearInterval(timer);
  });
}
