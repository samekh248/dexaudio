import { ScrobbleInputSchema } from "@dexaudio/shared-types";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { encrypt } from "../../lib/crypto.js";
import { lastfmAccounts } from "../../db/schema.js";
import * as outbox from "../../services/lastfm/scrobble-outbox.js";

const LastfmConnectionSchema = z.object({ sessionKey: z.string().min(1) });

export async function lastfmRoutes(app: FastifyInstance) {
  app.put("/lastfm/connection", async (request) => {
    const body = LastfmConnectionSchema.parse(request.body);
    const encrypted = encrypt(body.sessionKey, app.config.APP_SECRET);
    const existing = await app.db.select().from(lastfmAccounts).limit(1);
    if (existing[0]) {
      await app.db
        .update(lastfmAccounts)
        .set({ sessionKeyEncrypted: encrypted, connected: true, lastError: null })
        .where(eq(lastfmAccounts.id, existing[0].id));
    } else {
      await app.db.insert(lastfmAccounts).values({
        sessionKeyEncrypted: encrypted,
        connected: true,
      });
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
    return reply.status(202).send({ queued: true });
  });

  app.post("/lastfm/scrobbles/retry", async () => {
    await outbox.dropExpired(app.db);
    return { status: "retry_initiated", pending: await outbox.getPendingCount(app.db) };
  });
}
