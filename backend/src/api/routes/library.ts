import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../../lib/errors.js";
import * as plexConn from "../../services/plex/plex-connection-service.js";
import * as libraryService from "../../services/plex/library-service.js";
import * as albumGroupsService from "../../services/plex/album-groups-service.js";
import * as albumListService from "../../services/plex/album-list-service.js";

// Contract: specs/006-library-view-refactor/contracts/openapi.yaml

const groupQuerySchema = z.object({
  libraryId: z.string(),
  limit: z.coerce.number().int().min(1).max(20).default(albumGroupsService.HOME_PREVIEW_LIMIT),
});

const GROUP_CACHE_CONTROL = "private, max-age=60, stale-while-revalidate=300";

export async function libraryRoutes(app: FastifyInstance) {
  const resolveConfig = async () => {
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");
    return config;
  };

  app.get("/library/albums/groups/recently-played", async (request, reply) => {
    const { libraryId, limit } = groupQuerySchema.parse(request.query);
    const config = await resolveConfig();
    reply.header("Cache-Control", GROUP_CACHE_CONTROL);
    return albumGroupsService.getRecentlyPlayed(config, libraryId, limit);
  });

  app.get("/library/albums/groups/recently-added", async (request, reply) => {
    const { libraryId, limit } = groupQuerySchema.parse(request.query);
    const config = await resolveConfig();
    reply.header("Cache-Control", GROUP_CACHE_CONTROL);
    return albumGroupsService.getRecentlyAdded(config, libraryId, limit);
  });

  app.get("/library/albums/groups/hidden-gems", async (request, reply) => {
    const { libraryId, limit } = groupQuerySchema.parse(request.query);
    const config = await resolveConfig();
    reply.header("Cache-Control", GROUP_CACHE_CONTROL);
    return albumGroupsService.getHiddenGems(config, libraryId, limit);
  });

  app.get("/library/albums/groups/random-picks", async (request, reply) => {
    const { libraryId, limit } = groupQuerySchema.parse(request.query);
    const config = await resolveConfig();
    reply.header("Cache-Control", GROUP_CACHE_CONTROL);
    return albumGroupsService.getRandomPicks(config, libraryId, limit);
  });

  app.get("/library/albums/groups/artist-spotlights", async (request, reply) => {
    const { libraryId, limit } = groupQuerySchema.parse(request.query);
    const config = await resolveConfig();
    reply.header("Cache-Control", GROUP_CACHE_CONTROL);
    return albumGroupsService.getArtistSpotlights(app.db, config, libraryId, limit);
  });

  /** @deprecated Use per-group routes under `/library/albums/groups/{groupKey}`. */
  app.get("/library/albums/groups", async (request, reply) => {
    const { libraryId } = z.object({ libraryId: z.string() }).parse(request.query);
    const config = await resolveConfig();
    reply.header("Cache-Control", GROUP_CACHE_CONTROL);
    return albumGroupsService.getAlbumGroups(app.db, config, libraryId);
  });

  app.get("/library/albums/all", async (request, reply) => {
    const { libraryId } = z.object({ libraryId: z.string() }).parse(request.query);
    const config = await resolveConfig();
    const result = await albumListService.getAllAlbums(config, libraryId);
    reply.header("Cache-Control", "private, max-age=60, stale-while-revalidate=600");
    return result;
  });

  app.get("/library/albums", async (request) => {
    const query = z
      .object({
        libraryId: z.string(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().default(48),
      })
      .parse(request.query);

    const config = await resolveConfig();
    return libraryService.getAlbums(config, query.libraryId, query.page, query.pageSize);
  });

  app.get("/library/artists/:artistId/albums", async (request) => {
    const { artistId } = z.object({ artistId: z.string() }).parse(request.params);
    const config = await resolveConfig();
    return libraryService.getArtistAlbums(config, artistId);
  });

  app.get("/library/albums/:albumId/tracks", async (request) => {
    const { albumId } = z.object({ albumId: z.string() }).parse(request.params);
    const config = await resolveConfig();
    return libraryService.getAlbumTracks(config, albumId);
  });

  app.get("/library/search", async (request) => {
    const { q } = z.object({ q: z.string().min(1) }).parse(request.query);
    const config = await resolveConfig();
    return libraryService.searchLibrary(config, q);
  });
}
