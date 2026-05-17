/**
 * Saved Properties Routes (S8-09)
 *
 * tRPC routes for saving, organizing, and sharing properties.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { router, publicProcedure, protectedProcedure } from "../router-helpers.js";
import { prisma } from "../lib/prisma.js";

const ColumnEnum = z.enum(["interested", "shortlisted", "visited", "rejected"]);

export const savedPropertyRouter = router({
  /** Save a property */
  save: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        column: ColumnEnum.default("interested"),
        notes: z.string().max(1000).optional(),
        tags: z.array(z.string().max(50)).max(10).default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const saved = await prisma.savedProperty.upsert({
        where: {
          userId_propertyId: {
            userId: ctx.userId,
            propertyId: input.propertyId,
          },
        },
        create: {
          userId: ctx.userId,
          propertyId: input.propertyId,
          column: input.column,
          notes: input.notes || null,
          tags: input.tags,
        },
        update: {
          column: input.column,
          notes: input.notes || undefined,
          tags: input.tags,
        },
      });
      return saved;
    }),

  /** List all saved properties */
  list: protectedProcedure
    .input(
      z.object({
        column: ColumnEnum.optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const where: Prisma.SavedPropertyWhereInput = { userId: ctx.userId };
      if (input?.column) where.column = input.column;

      const saved = await prisma.savedProperty.findMany({
        where,
        orderBy: [{ column: "asc" }, { position: "asc" }],
      });

      // Hydrate with property data
      const propertyIds = saved.map((s) => s.propertyId);
      const properties =
        propertyIds.length > 0
          ? await prisma.property.findMany({
              where: { id: { in: propertyIds }, deletedAt: null },
            })
          : [];

      const propMap = new Map(properties.map((p) => [p.id, p]));

      return saved.map((s) => ({
        ...s,
        property: propMap.get(s.propertyId) || null,
      }));
    }),

  /** Move property to a different column */
  move: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        column: ColumnEnum,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.savedProperty.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Saved property not found" });
      }
      return prisma.savedProperty.update({
        where: { id: input.id },
        data: { column: input.column },
      });
    }),

  /** Update notes */
  updateNotes: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        notes: z.string().max(1000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.savedProperty.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return prisma.savedProperty.update({
        where: { id: input.id },
        data: { notes: input.notes },
      });
    }),

  /** Update tags */
  updateTags: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        tags: z.array(z.string().max(50)).max(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.savedProperty.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return prisma.savedProperty.update({
        where: { id: input.id },
        data: { tags: input.tags },
      });
    }),

  /** Remove a saved property */
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.savedProperty.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await prisma.savedProperty.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
