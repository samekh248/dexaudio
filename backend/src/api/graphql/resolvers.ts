import type { FastifyInstance } from "fastify";
import * as plexConn from "../../services/plex/plex-connection-service.js";
import * as libraryService from "../../services/plex/library-service.js";
import * as topStats from "../../services/plex/top-stats-service.js";
import { discogsReleases, collectionMatches } from "../../db/schema.js";

export function createResolvers(app: FastifyInstance) {
  return {
    Query: {
      library: async (
        _: unknown,
        args: { libraryId: string; page?: number; pageSize?: number },
      ) => {
        const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
        if (!config) return { items: [], total: 0, page: 1 };
        return libraryService.getAlbums(
          config,
          args.libraryId,
          args.page ?? 1,
          args.pageSize ?? 48,
        );
      },
      topStats: async () => {
        const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
        if (!config) return { songs: [], albums: [], artists: [] };
        return topStats.aggregateTopStats(config);
      },
      discogsCollection: async () => {
        const releases = await app.db.select().from(discogsReleases);
        const matches = await app.db.select().from(collectionMatches);
        const matchMap = new Map(matches.map((m) => [m.discogsReleaseId, m]));
        return releases.map((r) => {
          const m = matchMap.get(r.discogsReleaseId);
          return {
            releaseId: r.discogsReleaseId,
            title: r.title,
            artist: r.artist,
            matchStatus: m?.status ?? "not_on_plex",
            plexAlbumId: m?.plexRatingKey,
          };
        });
      },
    },
  };
}
