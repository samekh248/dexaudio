import { PlexConnectionInputSchema } from "@dexaudio/shared-types";
import type { FastifyInstance } from "fastify";
import * as plexService from "../../services/plex/plex-connection-service.js";

export async function plexRoutes(app: FastifyInstance) {
  app.get("/plex/connection", async (request) => {
    return plexService.getConnectionPublic(app.db, app.config.APP_SECRET);
  });

  app.put("/plex/connection", async (request) => {
    const body = PlexConnectionInputSchema.parse(request.body);
    return plexService.saveConnection(app.db, app.config.APP_SECRET, body);
  });

  app.get("/plex/libraries", async () => {
    return plexService.listLibraries(app.db, app.config.APP_SECRET);
  });
}
