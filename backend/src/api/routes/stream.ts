import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { AppError, BadGatewayError, NotFoundError } from "../../lib/errors.js";
import * as plexConn from "../../services/plex/plex-connection-service.js";
import type { PlexConfig } from "../../services/plex/plex-client.js";
import {
  fetchTrackMetadata,
  getStreamUrl,
  getTranscodeUrl,
  isBrowserNativeFormat,
  plexMediaHeaders,
} from "../../services/plex/plex-client.js";

function isPlayableContentType(contentType: string): boolean {
  if (!contentType) return true;
  const ct = contentType.toLowerCase();
  if (ct.includes("video") || ct.includes("text/html")) return false;
  if (ct.includes("json") || ct.includes("xml")) return false;
  if (ct.includes("mpegurl") || ct.includes("dash")) return false;
  return ct.includes("audio") || ct.includes("octet-stream") || ct.includes("mpeg");
}

async function proxyStream(
  config: PlexConfig,
  streamUrl: string,
  rangeHeader?: string,
): Promise<
  | {
      ok: true;
      body: ReadableStream<Uint8Array> | null;
      contentType: string;
      status: number;
      contentRange?: string;
      contentLength?: string;
    }
  | { ok: false; status: number }
> {
  const headers: Record<string, string> = { ...plexMediaHeaders(config.token) };
  if (rangeHeader) headers.Range = rangeHeader;

  const res = await fetch(streamUrl, { headers });
  if (!res.ok) return { ok: false, status: res.status };
  const ct = res.headers.get("content-type") ?? "audio/mpeg";
  if (!isPlayableContentType(ct)) return { ok: false, status: 415 };
  return {
    ok: true,
    body: res.body,
    contentType: ct,
    status: res.status,
    contentRange: res.headers.get("content-range") ?? undefined,
    contentLength: res.headers.get("content-length") ?? undefined,
  };
}

export async function streamRoutes(app: FastifyInstance) {
  app.get("/plex/photo", async (request, reply) => {
    const { path: plexPath } = z.object({ path: z.string().startsWith("/") }).parse(request.query);
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");

    const base = config.serverUrl.replace(/\/$/, "");
    const url = `${base}${plexPath}?X-Plex-Token=${encodeURIComponent(config.token)}`;
    const res = await fetch(url);
    if (!res.ok) throw new NotFoundError("Image not found");

    const ct = res.headers.get("content-type") ?? "image/jpeg";
    reply.header("content-type", ct);
    reply.header("cache-control", "public, max-age=86400, immutable");
    return reply.send(res.body);
  });

  app.get("/stream/:trackId", async (request, reply) => {
    const { trackId } = z.object({ trackId: z.string() }).parse(request.params);
    const rangeHeaderRaw = request.headers.range;
    const rangeHeader = Array.isArray(rangeHeaderRaw) ? rangeHeaderRaw[0] : rangeHeaderRaw;
    const config = await plexConn.getPlexConfig(app.db, app.config.APP_SECRET);
    if (!config) throw new NotFoundError("Plex not connected");

    let track;
    try {
      track = await fetchTrackMetadata(config, trackId);
    } catch {
      throw new BadGatewayError(
        "Could not reach Plex server",
        "Check that your Plex server is running and reachable",
      );
    }

    const streamUrls: string[] = [];
    if (!track || !isBrowserNativeFormat(track.format)) {
      streamUrls.push(getTranscodeUrl(config, trackId));
      streamUrls.push(getStreamUrl(config, trackId));
    } else {
      streamUrls.push(getStreamUrl(config, trackId));
      streamUrls.push(getTranscodeUrl(config, trackId));
    }

    for (const streamUrl of streamUrls) {
      const result = await proxyStream(config, streamUrl, rangeHeader);
      if (!result.ok) {
        if (result.status === 401) {
          throw new AppError(
            "Plex authentication expired",
            401,
            "AUTH_EXPIRED",
            "Re-authenticate with your Plex account",
          );
        }
        if (result.status === 404) {
          throw new NotFoundError("Track not found");
        }
        continue;
      }
      reply.code(result.status);
      reply.header("content-type", result.contentType);
      reply.header("accept-ranges", "bytes");
      reply.header("cache-control", "no-store");
      if (result.contentRange) reply.header("content-range", result.contentRange);
      if (result.contentLength) reply.header("content-length", result.contentLength);
      return reply.send(result.body);
    }

    const formatLabel = track?.format ?? "unknown";
    throw new AppError(
      `Unsupported audio format (${formatLabel})`,
      415,
      "UNSUPPORTED_FORMAT",
      "This format cannot be played. Skip this track.",
    );
  });
}
