import { LastfmConnectionInputSchema, ScrobbleInputSchema } from "@dexaudio/shared-types";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { encrypt } from "../../lib/crypto.js";
import { lastfmAccounts } from "../../db/schema.js";
import * as outbox from "../../services/lastfm/scrobble-outbox.js";
import * as syncService from "../../services/lastfm/lastfm-sync-service.js";
import * as authService from "../../services/lastfm/lastfm-auth-service.js";

const AuthStatusQuerySchema = z.object({ token: z.string().min(1) });

export async function lastfmRoutes(app: FastifyInstance) {
  app.post("/lastfm/auth/token", async () =>
    authService.startAuth(app.config.LASTFM_API_KEY, app.config.LASTFM_API_SECRET),
  );

  app.get("/lastfm/auth/status", async (request) => {
    const { token } = AuthStatusQuerySchema.parse(request.query);
    return authService.pollAuth(
      app.db,
      app.config.APP_SECRET,
      app.config.LASTFM_API_KEY,
      app.config.LASTFM_API_SECRET,
      token,
    );
  });

  app.put("/lastfm/connection", async (request) => {
    const body = LastfmConnectionInputSchema.parse(request.body);
    const existing = await app.db.select().from(lastfmAccounts).limit(1);
    let accountId = existing[0]?.id;

    const updates: Partial<typeof lastfmAccounts.$inferInsert> = {
      connected: true,
      lastError: null,
    };
    if (body.sessionKey) {
      updates.sessionKeyEncrypted = encrypt(body.sessionKey, app.config.APP_SECRET);
    }
    if (body.username) {
      updates.username = body.username;
    }

    if (existing[0]) {
      await app.db.update(lastfmAccounts).set(updates).where(eq(lastfmAccounts.id, existing[0].id));
      accountId = existing[0].id;
    } else {
      const inserted = await app.db
        .insert(lastfmAccounts)
        .values({
          sessionKeyEncrypted: updates.sessionKeyEncrypted,
          username: updates.username,
          connected: true,
        })
        .returning({ id: lastfmAccounts.id });
      accountId = inserted[0]?.id;
    }

    if (body.username && accountId) {
      const hadUsername = existing[0]?.username;
      if (!hadUsername || hadUsername !== body.username) {
        syncService.triggerBackfill(app.db, app.config.LASTFM_API_KEY, accountId, body.username);
      }
    }

    return { connected: true };
  });

  app.delete("/lastfm/connection", async (_request, reply) => {
    await app.db.update(lastfmAccounts).set({ connected: false });
    return reply.status(204).send();
  });

  app.post("/lastfm/scrobbles", async (request, reply) => {
    const body = ScrobbleInputSchema.parse(request.body);
    await outbox.enqueueScrobble(app.db, body);
    // Fire-and-forget delivery so a queued scrobble is sent promptly.
    void outbox
      .flushPending(app.db, {
        apiKey: app.config.LASTFM_API_KEY,
        apiSecret: app.config.LASTFM_API_SECRET,
        appSecret: app.config.APP_SECRET,
      })
      .catch((err) => app.log.error(err, "lastfm scrobble flush failed"));
    return reply.status(202).send({ queued: true });
  });

  app.post("/lastfm/scrobbles/retry", async () => {
    const result = await outbox.flushPending(app.db, {
      apiKey: app.config.LASTFM_API_KEY,
      apiSecret: app.config.LASTFM_API_SECRET,
      appSecret: app.config.APP_SECRET,
    });
    return { status: "retry_initiated", delivered: result.delivered, pending: result.pending };
  });
}
