import {
  PlayerListResponseSchema,
  PlayerStatusSchema,
  QueueSyncConflictSchema,
  QueueSyncInputSchema,
  RemoteControlInputSchema,
  RemotePlayDegradedResponseSchema,
  RemotePlayInputSchema,
} from "@dexaudio/shared-types";
import type { FastifyInstance } from "fastify";
import { AppError, UnauthorizedError } from "../../lib/errors.js";
import * as connectionService from "../../services/plex/plex-connection-service.js";
import * as clientsService from "../../services/plex/plex-clients-service.js";
import * as statusService from "../../services/plex/plex-player-status-service.js";
import * as remoteService from "../../services/plex/plex-remote-service.js";
import * as playQueueService from "../../services/plex/plex-playqueue-service.js";

const queueRevisionByClient = new Map<string, number>();
const playQueueIdByClient = new Map<string, string>();

async function requireConfig(app: FastifyInstance) {
  const config = await connectionService.getPlexConfig(app.db, app.config.APP_SECRET);
  if (!config) {
    throw new UnauthorizedError("No Plex connection", "Connect Plex in Settings");
  }
  return config;
}

async function requirePlayerTarget(
  app: FastifyInstance,
  clientId: string,
): Promise<{ config: Awaited<ReturnType<typeof requireConfig>>; target: Awaited<ReturnType<typeof clientsService.resolvePlayerTarget>> }> {
  const config = await requireConfig(app);
  const target = await clientsService.resolvePlayerTarget(config, clientId);
  if (!target) {
    throw new AppError("Player not found or unreachable", 404, "PLAYER_NOT_FOUND");
  }
  return { config, target };
}

export async function plexPlayersRoutes(app: FastifyInstance) {
  app.get("/plex/players", async (request) => {
    const config = await requireConfig(app);
    const refresh = (request.query as { refresh?: string }).refresh === "true";
    const { players, emptyReason } = await clientsService.fetchNetworkPlayers(config, { refresh });
    const response = PlayerListResponseSchema.parse({
      refreshedAt: new Date().toISOString(),
      players: players.map(({ baseUri: _b, ...rest }) => rest),
      emptyReason,
    });
    return response;
  });

  app.get("/plex/players/:clientId/status", async (request) => {
    const { clientId } = request.params as { clientId: string };
    const { target } = await requirePlayerTarget(app, clientId);
    const status = await statusService.fetchPlayerStatus(target, clientId);
    return PlayerStatusSchema.parse(status);
  });

  app.post("/plex/players/:clientId/play", async (request, reply) => {
    const { clientId } = request.params as { clientId: string };
    const body = RemotePlayInputSchema.parse(request.body);
    const { config, target } = await requirePlayerTarget(app, clientId);

    if (body.queue && body.queue.ratingKeys.length > 0) {
      const sync = await playQueueService.syncQueueToPlayer(
        config,
        target,
        body.queue.ratingKeys,
        body.queue.startIndex,
        playQueueIdByClient.get(clientId) ?? null,
        true,
      );
      if (sync.playQueueId) playQueueIdByClient.set(clientId, sync.playQueueId);
      if (sync.degraded) {
        return reply.status(200).send(
          RemotePlayDegradedResponseSchema.parse({
            degraded: true,
            message: sync.message ?? "Limited queue sync on this player",
          }),
        );
      }
      return reply.status(204).send();
    }

    try {
      await remoteService.playMedia(target, body.ratingKey, body.offsetMs ?? 0);
      return reply.status(204).send();
    } catch (err) {
      throw new AppError(
        err instanceof Error ? err.message : "Player unreachable",
        503,
        "PLAYER_UNREACHABLE",
      );
    }
  });

  app.post("/plex/players/:clientId/control", async (request, reply) => {
    const { clientId } = request.params as { clientId: string };
    const body = RemoteControlInputSchema.parse(request.body);
    const { target } = await requirePlayerTarget(app, clientId);
    try {
      await remoteService.sendTransportCommand(target, body.action, body.seekToMs);
      return reply.status(204).send();
    } catch (err) {
      throw new AppError(
        err instanceof Error ? err.message : "Control failed",
        503,
        "PLAYER_UNREACHABLE",
      );
    }
  });

  app.put("/plex/players/:clientId/queue", async (request, reply) => {
    const { clientId } = request.params as { clientId: string };
    const body = QueueSyncInputSchema.parse(request.body);
    const lastRev = queueRevisionByClient.get(clientId) ?? 0;
    if (body.queueRevision < lastRev) {
      return reply.status(409).send(
        QueueSyncConflictSchema.parse({
          queueRevision: lastRev,
          error: "Stale queue revision",
        }),
      );
    }
    queueRevisionByClient.set(clientId, body.queueRevision);

    const { config, target } = await requirePlayerTarget(app, clientId);
    const sync = await playQueueService.syncQueueToPlayer(
      config,
      target,
      body.ratingKeys,
      body.currentIndex,
      playQueueIdByClient.get(clientId) ?? null,
      body.interruptPlayback === true,
    );
    if (sync.playQueueId) playQueueIdByClient.set(clientId, sync.playQueueId);
    if (sync.degraded) {
      return reply.status(200).send(
        RemotePlayDegradedResponseSchema.parse({
          degraded: true,
          message: sync.message ?? "Limited queue sync on this player",
        }),
      );
    }
    return reply.status(204).send();
  });

  app.post("/plex/players/:clientId/switch-away", async (request, reply) => {
    const { clientId } = request.params as { clientId: string };
    try {
      const { target } = await requirePlayerTarget(app, clientId);
      await remoteService.stopPlayback(target);
    } catch {
      // Idempotent
    }
    playQueueIdByClient.delete(clientId);
    queueRevisionByClient.delete(clientId);
    return reply.status(204).send();
  });
}

/** @internal test helper */
export function resetPlexPlayersSessionForTests(): void {
  queueRevisionByClient.clear();
  playQueueIdByClient.clear();
  clientsService.clearClientUriCacheForTests();
}
