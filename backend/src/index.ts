import { buildApp } from "./app.js";
import { loadConfig } from "./lib/config.js";

async function main() {
  const config = loadConfig();
  const app = await buildApp(config);
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
