/**
 * Push Notification Routes (S8-10)
 *
 * Web Push API setup:
 * - Subscribe/unsubscribe
 * - Update notification preferences
 * - Send notification function
 * - Trigger stubs for property alerts and viewing reminders
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../router-helpers.js";
import { prisma } from "../lib/prisma.js";

// Web Push notification preferences schema
const NotificationPreferencesSchema = z.object({
  newMatches: z.boolean().default(true),
  priceDrops: z.boolean().default(true),
  viewingReminders: z.boolean().default(true),
});

export const pushRouter = router({
  /** Subscribe to push notifications */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
        preferences: NotificationPreferencesSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const subscription = await prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: {
          userId: ctx.userId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          preferences: input.preferences || {
            newMatches: true,
            priceDrops: true,
            viewingReminders: true,
          },
          isActive: true,
        },
        update: {
          userId: ctx.userId,
          p256dh: input.p256dh,
          auth: input.auth,
          isActive: true,
        },
      });

      return { success: true, id: subscription.id };
    }),

  /** Unsubscribe from push notifications */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      const subscription = await prisma.pushSubscription.findFirst({
        where: { endpoint: input.endpoint, userId: ctx.userId },
      });

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { isActive: false },
      });

      return { success: true };
    }),

  /** Update notification preferences */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        preferences: NotificationPreferencesSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const subscription = await prisma.pushSubscription.findFirst({
        where: { endpoint: input.endpoint, userId: ctx.userId },
      });

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { preferences: input.preferences },
      });

      return { success: true };
    }),

  /** Get user's notification preferences */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: ctx.userId, isActive: true },
      select: { id: true, endpoint: true, preferences: true, createdAt: true },
    });

    return {
      subscriptions,
      hasActiveSubscription: subscriptions.length > 0,
    };
  }),
});

/**
 * Send a push notification to a user.
 *
 * In production: use the `web-push` library with VAPID keys.
 * This is a stub that logs the notification.
 */
export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    url?: string;
    type: "new_match" | "price_drop" | "viewing_reminder";
  }
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, isActive: true },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const prefs = sub.preferences as Record<string, boolean>;

    // Check user preferences
    const prefMap: Record<string, string> = {
      new_match: "newMatches",
      price_drop: "priceDrops",
      viewing_reminder: "viewingReminders",
    };

    const prefKey = prefMap[notification.type];
    if (prefKey && prefs[prefKey] === false) {
      continue; // User opted out of this type
    }

    try {
      // TODO: Replace with actual web-push send
      // await webpush.sendNotification(
      //   { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      //   JSON.stringify(notification)
      // );
      console.log(`[Push Stub] Would send to ${sub.endpoint.slice(0, 50)}...`, notification.title);
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Trigger stubs — called when events happen
 */
export async function triggerPropertyAlert(userId: string, propertyTitle: string, matchReason: string) {
  return sendPushNotification(userId, {
    title: "New Property Match! 🏠",
    body: `${propertyTitle} — ${matchReason}`,
    type: "new_match",
    url: "/saved",
  });
}

export async function triggerViewingReminder(userId: string, propertyTitle: string, date: string, time: string) {
  return sendPushNotification(userId, {
    title: "Viewing Reminder 📅",
    body: `Your viewing at ${propertyTitle} is tomorrow at ${time}`,
    type: "viewing_reminder",
    url: "/saved",
  });
}

export async function triggerPriceDrop(userId: string, propertyTitle: string, oldPrice: number, newPrice: number) {
  const drop = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  return sendPushNotification(userId, {
    title: `Price Drop! 📉 -${drop}%`,
    body: `${propertyTitle} reduced from £${oldPrice.toLocaleString()} to £${newPrice.toLocaleString()}`,
    type: "price_drop",
    url: "/saved",
  });
}
