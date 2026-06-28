import Fastify from "fastify";
import { loadEnv } from "./infrastructure/config/env.js";

async function main() {
  const env = loadEnv();
  const app = Fastify({ logger: true });

  app.get("/api/health", async () => ({ status: "ok" }));

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
