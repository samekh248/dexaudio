import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  APP_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3001),
  GRAPHQL_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type AppConfig = z.infer<typeof envSchema>;

/** Stable Plex client identifier (FR-019); must not change between releases. */
export const PLEX_CLIENT_ID = "dex-audio-player";
export const PLEX_PRODUCT_NAME = "DexAudio";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse({
    DATABASE_URL: env.DATABASE_URL,
    APP_SECRET: env.APP_SECRET,
    PORT: env.PORT ?? "3001",
    GRAPHQL_ENABLED: env.GRAPHQL_ENABLED,
  });
}
