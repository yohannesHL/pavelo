/**
 * Viewing Booking Routes (S8-06)
 *
 * tRPC routes + REST endpoints for viewing bookings.
 * Calendar availability, book, cancel, list.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../router-helpers.js";
import { prisma } from "../lib/prisma.js";

// Available time slots
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
];

export const viewingRouter = router({
  /** Get available slots for a property on a date */
  getSlots: publicProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ input }) => {
      const { propertyId, date } = input;

      // Find already booked slots
      const booked = await prisma.viewingBooking.findMany({
        where: {
          propertyId,
          date: new Date(date),
          status: { in: ["pending", "confirmed"] },
        },
        select: { time: true },
      });

      const bookedTimes = new Set(booked.map((b) => b.time));
      const available = TIME_SLOTS.filter((t) => !bookedTimes.has(t));

      return {
        propertyId,
        date,
        slots: available,
        bookedSlots: Array.from(bookedTimes),
        total: TIME_SLOTS.length,
      };
    }),

  /** Book a viewing */
  book: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { propertyId, date, time, notes } = input;

      // Check for conflicts
      const existing = await prisma.viewingBooking.findFirst({
        where: {
          propertyId,
          date: new Date(date),
          time,
          status: { in: ["pending", "confirmed"] },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This time slot is already booked",
        });
      }

      // Check user doesn't have too many bookings
      const userBookings = await prisma.viewingBooking.count({
        where: {
          userId: ctx.userId,
          status: { in: ["pending", "confirmed"] },
        },
      });

      if (userBookings >= 10) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Maximum of 10 active bookings allowed",
        });
      }

      const booking = await prisma.viewingBooking.create({
        data: {
          propertyId,
          userId: ctx.userId,
          date: new Date(date),
          time,
          notes: notes || null,
        },
      });

      // TODO: Send confirmation email via Resend
      // await sendViewingConfirmation(ctx.userId, booking);

      return {
        status: "success",
        booking,
        message: `Viewing booked for ${date} at ${time}`,
      };
    }),

  /** Cancel a booking */
  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const booking = await prisma.viewingBooking.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      if (booking.status === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Booking already cancelled" });
      }

      await prisma.viewingBooking.update({
        where: { id: input.id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: input.reason || null,
        },
      });

      return { success: true };
    }),

  /** List user's bookings */
  list: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "confirmed", "cancelled", "completed", "no_show"])
          .optional(),
      })
      .optional()
    )
    .query(async ({ input, ctx }) => {
      const where: any = { userId: ctx.userId };
      if (input?.status) where.status = input.status;

      return prisma.viewingBooking.findMany({
        where,
        orderBy: { date: "asc" },
      });
    }),

  /** Confirm a booking (only booking owner can confirm) */
  confirm: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const booking = await prisma.viewingBooking.findFirst({
        where: { id: input.id },
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      // Ownership check: only the booking owner can confirm
      if (booking.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only confirm your own bookings",
        });
      }

      await prisma.viewingBooking.update({
        where: { id: input.id },
        data: {
          status: "confirmed",
          confirmedAt: new Date(),
        },
      });

      return { success: true };
    }),
});
