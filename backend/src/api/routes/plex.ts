import { PlexConnectionInputSchema, PlexTimelineInputSchema } from "@dexaudio/shared-types";
import type { FastifyInstance } from "fastify";
import * as plexService from "../../services/plex/plex-connection-service.js";
import * as timelineRoute from "../../services/plex/plex-timeline-route-service.js";

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

  app.post("/plex/timeline", async (request, reply) => {
    const body = PlexTimelineInputSchema.parse(request.body);
    const result = await timelineRoute.submitTimeline(app.db, app.config.APP_SECRET, body);
    if (result.status === 401) {
      return reply.status(401).send({ message: result.message, code: "plex_not_connected" });
    }
    if (result.status === 202) {
      return reply.status(202).send({ queued: result.queued });
    }
    return reply.status(204).send();
  });

  app.get("/plex/reporting/status", async () => {
    return timelineRoute.getReportingStatus(app.db, app.config.APP_SECRET);
  });

  app.post("/plex/reporting/retry", async () => {
    return timelineRoute.retryReporting(app.db, app.config.APP_SECRET);
  });
}
