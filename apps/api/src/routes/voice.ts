/**
 * Voice tRPC routes (S6-01, S6-07)
 *
 * Provides voice session management:
 * - createSession: creates LiveKit room, generates token, tracks in DB
 * - endSession: ends voice session, updates duration, cleans up room
 * - getSession: get current active session
 * - getMetrics: voice quality monitoring data (S6-10)
 *
 * Enforces:
 * - 1 active voice session per user (concurrent session limit)
 * - Session token expiry (1 hour)
 * - Recording consent tracking
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../router-helpers.js";
import { prisma } from "../lib/prisma.js";
import {
  generateToken,
  createRoom,
  deleteRoom,
  generateRoomName,
  livekitConfig,
} from "../lib/livekit.js";

// --- Schemas ---

const CreateSessionInput = z.object({
  conversationId: z.string().uuid().optional(),
  language: z.string().min(2).max(10).default("en"),
  recordingConsent: z.boolean().default(false),
});

const EndSessionInput = z.object({
  sessionId: z.string().uuid(),
});

const UpdateSessionMetricsInput = z.object({
  sessionId: z.string().uuid(),
  interruptionCount: z.number().int().min(0).optional(),
  toolCallCount: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// --- Router ---

export const voiceRouter = router({
  /** Create a new voice session — returns LiveKit token + room info */
  createSession: protectedProcedure
    .input(CreateSessionInput)
    .mutation(async ({ input, ctx }) => {
      // Auto-end any stale active session for this user
      const existingActive = await prisma.voiceSession.findFirst({
        where: {
          userId: ctx.userId,
          status: "active",
        },
      });

      if (existingActive) {
        const endedAt = new Date();
        const durationSecs = Math.floor(
          (endedAt.getTime() - existingActive.startedAt.getTime()) / 1000
        );
        await prisma.voiceSession.update({
          where: { id: existingActive.id },
          data: { status: "ended", endedAt, durationSecs },
        });
        try {
          await deleteRoom(existingActive.roomName);
        } catch {
          // Room may already be gone
        }
        console.log(`Auto-ended stale voice session ${existingActive.id} for user ${ctx.userId}`);
      }

      // Generate room name
      const roomName = generateRoomName(ctx.userId);

      // Create LiveKit room
      try {
        await createRoom(roomName, {
          emptyTimeout: 300, // 5 min auto-cleanup
          maxParticipants: 3, // user + agent + optional observer
        });
      } catch (error: unknown) {
        console.error("Failed to create LiveKit room:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create voice room. Please try again.",
        });
      }

      // Create or link conversation
      let conversationId = input.conversationId;
      if (!conversationId) {
        const conversation = await prisma.conversation.create({
          data: {
            userId: ctx.userId,
            title: "Voice Session",
            metadata: { type: "voice" },
          },
        });
        conversationId = conversation.id;
      }

      // Create voice session record
      const session = await prisma.voiceSession.create({
        data: {
          userId: ctx.userId,
          conversationId,
          roomName,
          language: input.language,
          recordingConsent: input.recordingConsent,
          status: "active",
        },
      });

      // Generate participant token
      const userName = ctx.userEmail || "User";
      const token = await generateToken(
        roomName,
        `user-${ctx.userId}`,
        userName,
        {
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
          metadata: JSON.stringify({
            sessionId: session.id,
            userId: ctx.userId,
            language: input.language,
          }),
        }
      );

      return {
        sessionId: session.id,
        roomName,
        token,
        livekitUrl: livekitConfig.wsUrl,
        conversationId,
        language: input.language,
      };
    }),

  /** End an active voice session */
  endSession: protectedProcedure
    .input(EndSessionInput)
    .mutation(async ({ input, ctx }) => {
      const session = await prisma.voiceSession.findFirst({
        where: {
          id: input.sessionId,
          userId: ctx.userId,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice session not found",
        });
      }

      if (session.status !== "active") {
        return { success: true, alreadyEnded: true };
      }

      // Calculate duration
      const endedAt = new Date();
      const durationSecs = Math.floor(
        (endedAt.getTime() - session.startedAt.getTime()) / 1000
      );

      // Update session
      await prisma.voiceSession.update({
        where: { id: session.id },
        data: {
          status: "ended",
          endedAt,
          durationSecs,
        },
      });

      // Clean up LiveKit room
      try {
        await deleteRoom(session.roomName);
      } catch (error: unknown) {
        // Room may already be deleted — not critical
        console.warn("Failed to delete LiveKit room:", error);
      }

      return {
        success: true,
        durationSecs,
        alreadyEnded: false,
      };
    }),

  /** Get user's active voice session (if any) */
  getActiveSession: protectedProcedure.query(async ({ ctx }) => {
    const session = await prisma.voiceSession.findFirst({
      where: {
        userId: ctx.userId,
        status: "active",
      },
      include: {
        conversation: {
          select: { id: true, title: true },
        },
      },
    });

    return session;
  }),

  /** Get session by ID */
  getSession: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const session = await prisma.voiceSession.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          conversation: {
            select: { id: true, title: true },
          },
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice session not found",
        });
      }

      return session;
    }),

  /** Update session metrics (called during/after session) */
  updateMetrics: protectedProcedure
    .input(UpdateSessionMetricsInput)
    .mutation(async ({ input, ctx }) => {
      const session = await prisma.voiceSession.findFirst({
        where: {
          id: input.sessionId,
          userId: ctx.userId,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice session not found",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (input.interruptionCount !== undefined) {
        updateData.interruptionCount = input.interruptionCount;
      }
      if (input.toolCallCount !== undefined) {
        updateData.toolCallCount = input.toolCallCount;
      }
      if (input.metadata) {
        // Merge with existing metadata
        const existingMeta =
          typeof session.metadata === "object" && session.metadata !== null
            ? session.metadata
            : {};
        updateData.metadata = { ...existingMeta, ...input.metadata };
      }

      await prisma.voiceSession.update({
        where: { id: session.id },
        data: updateData,
      });

      return { success: true };
    }),

  /** List user's voice session history */
  listSessions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, cursor } = input;

      const sessions = await prisma.voiceSession.findMany({
        where: { userId: ctx.userId },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { startedAt: "desc" },
        include: {
          conversation: {
            select: { id: true, title: true },
          },
        },
      });

      let nextCursor: string | null = null;
      if (sessions.length > limit) {
        const next = sessions.pop()!;
        nextCursor = next.id;
      }

      return { items: sessions, nextCursor };
    }),

  /** Voice quality metrics endpoint (S6-10) */
  getMetrics: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const sessions = await prisma.voiceSession.findMany({
        where: {
          userId: ctx.userId,
          startedAt: { gte: since },
        },
        orderBy: { startedAt: "desc" },
      });

      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(
        (s) => s.status === "ended"
      ).length;
      const failedSessions = sessions.filter(
        (s) => s.status === "failed"
      ).length;

      const totalDuration = sessions
        .filter((s) => s.durationSecs != null)
        .reduce((sum, s) => sum + (s.durationSecs || 0), 0);

      const avgDuration =
        completedSessions > 0
          ? Math.round(totalDuration / completedSessions)
          : 0;

      const totalInterruptions = sessions.reduce(
        (sum, s) => sum + s.interruptionCount,
        0
      );

      const totalToolCalls = sessions.reduce(
        (sum, s) => sum + s.toolCallCount,
        0
      );

      // Language distribution
      const langDist: Record<string, number> = {};
      for (const s of sessions) {
        langDist[s.language] = (langDist[s.language] || 0) + 1;
      }

      // Extract TTFB from metadata if available
      const ttfbValues = sessions
        .map((s) => {
          const meta = s.metadata as Record<string, unknown> | null;
          return meta?.ttfbMs as number | undefined;
        })
        .filter((v): v is number => typeof v === "number");

      const avgTtfb =
        ttfbValues.length > 0
          ? Math.round(
              ttfbValues.reduce((a, b) => a + b, 0) / ttfbValues.length
            )
          : null;

      return {
        totalSessions,
        completedSessions,
        failedSessions,
        totalDurationSecs: totalDuration,
        avgDurationSecs: avgDuration,
        totalInterruptions,
        totalToolCalls,
        avgTtfbMs: avgTtfb,
        languageDistribution: langDist,
        period: `${input.days} days`,
      };
    }),
});
