import {
  PlexAuthCompleteInputSchema,
} from "@dexaudio/shared-types";
import type { FastifyInstance } from "fastify";
import * as authService from "../../services/plex/plex-auth-service.js";

export async function plexAuthRoutes(app: FastifyInstance) {
  app.post("/plex/auth/pin", async () => authService.createPin());

  app.get<{ Params: { pinId: string } }>("/plex/auth/pin/:pinId/status", async (request) => {
    const pinId = Number(request.params.pinId);
    if (!Number.isFinite(pinId)) {
      return { authorized: false, expired: true };
    }
    return authService.getPinStatus(pinId);
  });

  app.get("/plex/auth/servers", async () => authService.listServers());

  app.get<{ Params: { machineId: string } }>(
    "/plex/auth/servers/:machineId/libraries",
    async (request) => authService.listServerLibraries(request.params.machineId),
  );

  app.post("/plex/auth/complete", async (request) => {
    const body = PlexAuthCompleteInputSchema.parse(request.body);
    return authService.completeAuth(app.db, app.config.APP_SECRET, body);
  });

  app.get("/plex/account", async () => authService.getAccountIdentity(app.db));
}
