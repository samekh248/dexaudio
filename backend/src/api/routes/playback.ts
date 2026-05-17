import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../../lib/errors.js";
import * as plexConn from "../../services/plex/plex-connection-service.js";
import * as similarService from "../../services/plex/similar-tracks-service.js";

export async function playbackRoutes(app: FastifyInstance) {
  app.get("/playback/similar", async (request) => {
    const query = z
      .object({
        seedTrackId: z.string(),
        limit: z.coerce.number().default(25),
      })
      .parse(request.query);

    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");
    return similarService.getSimilarTracks(config, query.seedTrackId, query.limit);
  });
}
