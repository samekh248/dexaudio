import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { AppError, NotFoundError } from "../../lib/errors.js";
import * as plexConn from "../../services/plex/plex-connection-service.js";
import * as libraryService from "../../services/plex/library-service.js";
import { getStreamUrl } from "../../services/plex/plex-client.js";

export async function streamRoutes(app: FastifyInstance) {
  app.get("/stream/:trackId", async (request, reply) => {
    const { trackId } = z.object({ trackId: z.string() }).parse(request.params);
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");

    // Find track format via album search is expensive; stream proxy validates on Plex side
    const streamUrl = getStreamUrl(config, trackId);
    const head = await fetch(streamUrl, { method: "HEAD" });
    if (head.status === 415) {
      throw new AppError("Unsupported audio format", 415, "UNSUPPORTED_FORMAT", "Play FLAC or MP3 only");
    }
    if (!head.ok && head.status !== 405) {
      throw new NotFoundError("Track not found");
    }

    const contentType = head.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("audio") && !contentType.includes("octet-stream")) {
      if (contentType.includes("json") || contentType.includes("xml")) {
        // Plex may return redirect - proxy full GET
      }
    }

    const stream = await fetch(streamUrl);
    if (!stream.ok) throw new NotFoundError("Track not found");

    const ct = stream.headers.get("content-type") ?? "audio/mpeg";
    if (ct.includes("video") || ct.includes("text/html")) {
      throw new AppError("Unsupported audio format", 415, "UNSUPPORTED_FORMAT");
    }

    reply.header("content-type", ct);
    return reply.send(stream.body);
  });
}
