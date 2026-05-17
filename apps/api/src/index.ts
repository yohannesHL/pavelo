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
import { websocketPlugin } from "./routes/websocket.js";

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

// --- WebSocket ---
await app.register(websocketPlugin);

// --- Health Check ---
app.get("/health", async () => {
  return {
    status: "ok",
    version: "0.3.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
});

// --- Voice Metrics REST Endpoint (S6-10) ---
app.get("/api/v1/voice/metrics", async (request) => {
  // This is a convenience REST alias for the tRPC voice.getMetrics endpoint
  // For full auth, use the tRPC endpoint; this provides basic access
  return {
    message: "Use tRPC endpoint voice.getMetrics for authenticated metrics",
    endpoint: "/trpc/voice.getMetrics",
  };
});

// --- Memory Profile REST Endpoint (S8-01) ---
// Called by the Python agent service to store consolidated profiles
import { prisma } from "./lib/prisma.js";

app.post("/api/v1/memory/profile", async (request, reply) => {
  const body = request.body as any;
  if (!body?.userId) {
    return reply.code(400).send({ error: "userId required" });
  }

  try {
    const { userId, lastConsolidatedAt, ...data } = body;
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
        lastConsolidatedAt: lastConsolidatedAt
          ? new Date(lastConsolidatedAt)
          : new Date(),
        consolidationCount: 1,
      },
      update: {
        ...data,
        lastConsolidatedAt: lastConsolidatedAt
          ? new Date(lastConsolidatedAt)
          : new Date(),
        consolidationCount: { increment: 1 },
      },
    });
    return reply.code(200).send(profile);
  } catch (err: any) {
    return reply.code(500).send({ error: err.message });
  }
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
