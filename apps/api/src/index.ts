import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import { config } from "dotenv";
import { appRouter, type AppRouter } from "./router.js";
import { createContext } from "./context.js";
import { imageRoutes } from "./routes/upload.js";

config();

const app = Fastify({
  logger: true,
});

// --- Middleware ---
await app.register(helmet);
await app.register(cors, {
  origin:
    process.env.NODE_ENV === "development"
      ? true
      : ["http://localhost:3000"],
  credentials: true,
});
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

// --- tRPC ---
await app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

// --- REST Routes ---
await app.register(imageRoutes);

// --- Health Check ---
app.get("/health", async () => {
  return {
    status: "ok",
    version: "0.2.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
});

// --- Start Server ---
const port = Number(process.env.API_PORT) || 4000;
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`🚀 API Gateway running at http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export default app;
