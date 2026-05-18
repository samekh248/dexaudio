import Fastify from "fastify";
import cors from "@fastify/cors";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import type { AppConfig } from "./lib/config.js";
import { AppError } from "./lib/errors.js";
import { getDb } from "./db/index.js";
import { registerRoutes } from "./api/routes/index.js";

export async function buildApp(config: AppConfig) {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: true });

  const db = getDb(config.DATABASE_URL);
  app.decorate("config", config);
  app.decorate("db", db);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toBody());
    }
    app.log.error(error);
    return reply.status(500).send({
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  });

  await registerRoutes(app, config);
  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    db: ReturnType<typeof getDb>;
  }
}
