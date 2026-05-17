import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
      include: [
        "src/lib/**/*.ts",
        "src/services/discogs/matcher.ts",
        "src/services/plex/plex-client.ts",
        "src/services/plex/top-stats-service.ts",
        "src/services/lastfm/lastfm-client.ts",
        "src/services/lastfm/scrobble-outbox.ts",
        "src/services/settings/settings-repository.ts",
      ],
    },
  },
});
