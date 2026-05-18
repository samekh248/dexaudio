import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
      include: [
        "src/lib/cache-lru.ts",
        "src/lib/scrobble-threshold.ts",
        "src/lib/custom-theme-presets.ts",
        "src/lib/local-storage.ts",
        "src/lib/cache-service.ts",
        "src/lib/scrobble-tracker.ts",
        "src/lib/pin-service.ts",
        "src/lib/utils.ts",
        "src/stores/playback-queue-store.ts",
        "src/services/api-client.ts",
        "src/components/stats/**",
      ],
      exclude: ["src/main.tsx"],
    },
  },
});
