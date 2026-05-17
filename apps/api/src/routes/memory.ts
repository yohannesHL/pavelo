/**
 * Memory & Profile Routes (S8-01, S8-02)
 * 
 * tRPC routes for user memory profiles and consolidation.
 * Also includes REST endpoint for agent service to write profiles.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../router-helpers.js";
import { prisma } from "../lib/prisma.js";

export const memoryRouter = router({
  /** Get user's consolidated memory profile */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: ctx.userId },
    });

    if (!profile) {
      return null;
    }

    return profile;
  }),

  /** Update a specific preference */
  updatePreference: protectedProcedure
    .input(
      z.object({
        field: z.enum([
          "budgetMin",
          "budgetMax",
          "preferredAreas",
          "propertyStyles",
          "propertyTypes",
          "dealBreakers",
        ]),
        value: z.union([z.number(), z.string(), z.array(z.string())]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { field, value } = input;

      // Upsert profile
      const profile = await prisma.userProfile.upsert({
        where: { userId: ctx.userId },
        create: {
          userId: ctx.userId,
          [field]: value,
        },
        update: {
          [field]: value,
        },
      });

      return profile;
    }),

  /** Delete a specific memory from the timeline */
  deleteMemory: protectedProcedure
    .input(z.object({ memoryId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: ctx.userId },
      });

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      // Filter out the memory from the timeline
      const memories = (profile.memories as any[]) || [];
      const updated = memories.filter((m: any) => m.id !== input.memoryId);

      await prisma.userProfile.update({
        where: { userId: ctx.userId },
        data: { memories: updated },
      });

      return { success: true, remaining: updated.length };
    }),

  /** Trigger memory consolidation via agent service */
  consolidate: protectedProcedure.mutation(async ({ ctx }) => {
    const agentUrl = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

    try {
      const response = await fetch(
        `${agentUrl}/api/v1/memory/consolidate/${ctx.userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: false }),
        }
      );

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Agent service error: ${response.status}`,
        });
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to consolidate: ${error.message}`,
      });
    }
  }),

  /** Update entire memory profile (authenticated — user can only update own profile) */
  updateProfile: protectedProcedure
    .input(
      z.object({
        preferences: z.record(z.any()).optional(),
        budgetMin: z.number().nullable().optional(),
        budgetMax: z.number().nullable().optional(),
        preferredAreas: z.array(z.string()).optional(),
        propertyStyles: z.array(z.string()).optional(),
        propertyTypes: z.array(z.string()).optional(),
        dealBreakers: z.array(z.string()).optional(),
        intentPatterns: z.record(z.any()).optional(),
        sentimentScore: z.number().nullable().optional(),
        memories: z.array(z.any()).optional(),
        lastConsolidatedAt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      const { lastConsolidatedAt, ...data } = input;

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

      return profile;
    }),
});
