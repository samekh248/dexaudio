import { z } from "zod";
import type { FastifyInstance } from "fastify";
import * as settingsRepo from "../../services/settings/settings-repository.js";
import * as resetService from "../../services/settings/reset-service.js";

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/settings", async () => settingsRepo.getSettings(app.db));

  app.patch("/settings", async (request) => {
    const patch = z.record(z.unknown()).parse(request.body);
    return settingsRepo.patchSettings(app.db, patch);
  });

  app.post("/settings/reset", async (request, reply) => {
    const body = z
      .object({
        targets: z.array(
          z.enum(["plex", "discogs", "lastfm", "collection", "cache", "scrobbles", "all"]),
        ),
      })
      .parse(request.body ?? {});
    await resetService.resetTargets(app.db, body.targets);
    return reply.status(204).send();
  });
}
