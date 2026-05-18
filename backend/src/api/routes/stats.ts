import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../../lib/errors.js";
import * as plexConn from "../../services/plex/plex-connection-service.js";
import * as topStats from "../../services/plex/top-stats-service.js";

export async function statsRoutes(app: FastifyInstance) {
  app.get("/stats/top", async () => {
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");
    return topStats.aggregateTopStats(config);
  });
}
