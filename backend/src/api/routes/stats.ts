import {
  ListeningOverviewSchema,
  ListeningPatternsSchema,
  LastfmSyncStatusSchema,
  StatsGranularitySchema,
  StatsPeriodSchema,
} from "@dexaudio/shared-types";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../../lib/errors.js";
import * as plexConn from "../../services/plex/plex-connection-service.js";
import * as topStats from "../../services/plex/top-stats-service.js";
import * as listeningStats from "../../services/lastfm/listening-stats-service.js";

const OverviewQuerySchema = z.object({
  period: StatsPeriodSchema,
  tz: z.string().optional(),
});

const PatternsQuerySchema = OverviewQuerySchema.extend({
  granularity: StatsGranularitySchema.optional(),
});

export async function statsRoutes(app: FastifyInstance) {
  app.get("/stats/top", async () => {
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");
    return topStats.aggregateTopStats(config);
  });

  app.get("/stats/overview", async (request) => {
    const query = OverviewQuerySchema.parse(request.query);
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    const overview = await listeningStats.getListeningOverview(
      app.db,
      { period: query.period, tz: query.tz ?? "UTC" },
      config,
    );
    return ListeningOverviewSchema.parse(overview);
  });

  app.get("/stats/patterns", async (request) => {
    const query = PatternsQuerySchema.parse(request.query);
    const patterns = await listeningStats.getListeningPatterns(app.db, {
      period: query.period,
      tz: query.tz ?? "UTC",
      granularity: query.granularity,
    });
    return ListeningPatternsSchema.parse(patterns);
  });

  app.get("/stats/sync/status", async () => {
    const status = await listeningStats.getLastfmSyncStatus(app.db);
    return LastfmSyncStatusSchema.parse(status);
  });
}
