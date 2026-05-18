import { z } from "zod";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors.js";
import { collectionMatches, discogsReleases } from "../../db/schema.js";
import * as discogsSync from "../../services/discogs/sync-service.js";
import { RateLimitError } from "../../services/discogs/discogs-client.js";
import * as plexConn from "../../services/plex/plex-connection-service.js";
import * as libraryService from "../../services/plex/library-service.js";

export async function discogsRoutes(app: FastifyInstance) {
  app.put("/discogs/connection", async (request) => {
    const body = z.object({ username: z.string(), token: z.string() }).parse(request.body);
    await discogsSync.saveDiscogsConnection(app.db, app.config.APP_SECRET, body.username, body.token);
    return { ok: true };
  });

  app.post("/discogs/sync", async () => {
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new AppError("Plex not connected", 400);

    const libraryIds = (await plexConn.getConnectionPublic(app.db, app.config.APP_SECRET)).libraryIds ?? [];
    const libraryId = libraryIds[0];
    if (!libraryId) throw new AppError("No library selected", 400);

    try {
      const albums = (await libraryService.getAlbums(config, libraryId, 1, 500)).items;
      await discogsSync.syncCollection(app.db, app.config.APP_SECRET, albums, "fuzzy");
      return { status: "completed" };
    } catch (e) {
      if (e instanceof RateLimitError) {
        throw new AppError("Rate limited — retry later", 429, "RATE_LIMITED");
      }
      throw e;
    }
  });

  app.get("/discogs/collection", async (request) => {
    const query = z
      .object({ status: z.enum(["matched", "partial", "not_on_plex"]).optional() })
      .parse(request.query);

    const releases = await app.db.select().from(discogsReleases);
    const matches = await app.db.select().from(collectionMatches);
    const matchByRelease = new Map(matches.map((m) => [m.discogsReleaseId, m]));

    return releases
      .map((r) => {
        const m = matchByRelease.get(r.discogsReleaseId);
        return {
          releaseId: r.discogsReleaseId,
          title: r.title,
          artist: r.artist,
          year: r.year ?? undefined,
          format: r.format ?? undefined,
          matchStatus: m?.status ?? ("not_on_plex" as const),
          plexAlbumId: m?.plexRatingKey ?? null,
        };
      })
      .filter((item) => !query.status || item.matchStatus === query.status);
  });

  app.patch("/discogs/matches/:releaseId", async (request) => {
    const { releaseId } = z.object({ releaseId: z.coerce.number() }).parse(request.params);
    const body = z
      .object({
        plexAlbumId: z.string().nullable().optional(),
        status: z.enum(["matched", "partial", "not_on_plex"]).optional(),
      })
      .parse(request.body);

    await app.db
      .update(collectionMatches)
      .set({
        plexRatingKey: body.plexAlbumId ?? undefined,
        status: body.status,
        manualOverride: true,
      })
      .where(eq(collectionMatches.discogsReleaseId, releaseId));

    return { ok: true };
  });
}
