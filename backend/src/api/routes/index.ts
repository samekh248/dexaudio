import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../../lib/config.js";
import { healthRoutes } from "./health.js";
import { plexRoutes } from "./plex.js";
import { libraryRoutes } from "./library.js";
import { streamRoutes } from "./stream.js";
import { playbackRoutes } from "./playback.js";
import { statsRoutes } from "./stats.js";
import { discogsRoutes } from "./discogs.js";
import { lastfmRoutes } from "./lastfm.js";
import { settingsRoutes } from "./settings.js";

export async function registerRoutes(app: FastifyInstance, config: AppConfig) {
  await app.register(
    async (api) => {
      await healthRoutes(api);
      await plexRoutes(api);
      await libraryRoutes(api);
      await streamRoutes(api);
      await playbackRoutes(api);
      await statsRoutes(api);
      await discogsRoutes(api);
      await lastfmRoutes(api);
      await settingsRoutes(api);

      if (config.GRAPHQL_ENABLED) {
        const { registerGraphql } = await import("../graphql/register.js");
        await registerGraphql(api);
      }
    },
    { prefix: "/api/v1" },
  );
}
