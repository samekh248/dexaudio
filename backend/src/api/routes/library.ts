import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../../lib/errors.js";
import * as plexConn from "../../services/plex/plex-connection-service.js";
import * as libraryService from "../../services/plex/library-service.js";
import * as albumGroupsService from "../../services/plex/album-groups-service.js";
import * as albumListService from "../../services/plex/album-list-service.js";

export async function libraryRoutes(app: FastifyInstance) {
  app.get("/library/albums/groups", async (request) => {
    const { libraryId } = z.object({ libraryId: z.string() }).parse(request.query);
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");
    return albumGroupsService.getAlbumGroups(app.db, config, libraryId);
  });

  app.get("/library/albums/all", async (request, reply) => {
    const { libraryId } = z.object({ libraryId: z.string() }).parse(request.query);
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");
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

    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");
    return libraryService.getAlbums(config, query.libraryId, query.page, query.pageSize);
  });

  app.get("/library/artists/:artistId/albums", async (request) => {
    const { artistId } = z.object({ artistId: z.string() }).parse(request.params);
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");
    return libraryService.getArtistAlbums(config, artistId);
  });

  app.get("/library/albums/:albumId/tracks", async (request) => {
    const { albumId } = z.object({ albumId: z.string() }).parse(request.params);
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");
    return libraryService.getAlbumTracks(config, albumId);
  });

  app.get("/library/search", async (request) => {
    const { q } = z.object({ q: z.string().min(1) }).parse(request.query);
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");
    return libraryService.searchLibrary(config, q);
  });
}
