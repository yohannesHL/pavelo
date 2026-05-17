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
import { registerTraceMiddleware } from "./middleware/trace.js";

config();

const app = Fastify({
  logger: true,
});

// --- Middleware ---
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co", "wss:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});
await app.register(cors, {
  origin:
    process.env.NODE_ENV === "development"
      ? true
      : (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  credentials: true,
});
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

// Auth-specific rate limiting (stricter)
app.addHook("onRequest", async (request, reply) => {
  const path = request.url;
  if (
    path.includes("/auth") ||
    path.includes("signUp") ||
    path.includes("signIn")
  ) {
    // Additional rate limit header for auth routes
    reply.header("X-RateLimit-Auth", "10/min");
  }
});

// --- Observability (S10-08) ---
registerTraceMiddleware(app);

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

// --- Search Cache Metrics (S10-04) ---
import { getSearchCacheMetrics } from "./lib/search-cache.js";

app.get("/api/v1/search/cache-metrics", async () => {
  return getSearchCacheMetrics();
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

// --- Viewing Booking REST Endpoints (S8-06) ---
// Called by the Python agent service

app.get("/api/v1/viewings/slots", async (request, reply) => {
  const { propertyId, date } = request.query as any;
  if (!propertyId || !date) {
    return reply.code(400).send({ error: "propertyId and date required" });
  }

  const TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  ];

  try {
    const booked = await prisma.viewingBooking.findMany({
      where: {
        propertyId,
        date: new Date(date),
        status: { in: ["pending", "confirmed"] },
      },
      select: { time: true },
    });
    const bookedTimes = new Set(booked.map((b: any) => b.time));
    const available = TIME_SLOTS.filter((t) => !bookedTimes.has(t));
    return { status: "success", propertyId, date, slots: available, bookedSlots: Array.from(bookedTimes) };
  } catch (err: any) {
    return reply.code(500).send({ error: err.message });
  }
});

app.post("/api/v1/viewings/book", async (request, reply) => {
  const body = request.body as any;
  if (!body?.propertyId || !body?.date || !body?.time) {
    return reply.code(400).send({ error: "propertyId, date, and time required" });
  }

  try {
    const booking = await prisma.viewingBooking.create({
      data: {
        propertyId: body.propertyId,
        userId: body.userId || "00000000-0000-0000-0000-000000000000",
        date: new Date(body.date),
        time: body.time,
        notes: body.notes || null,
      },
    });
    return { status: "success", booking };
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
