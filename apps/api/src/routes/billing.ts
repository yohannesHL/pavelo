/**
 * Stripe Billing tRPC Routes (S9-07)
 *
 * Subscription plans: Starter / Growth / Enterprise
 * Stripe Checkout, webhook handler, usage metering, billing page data.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../router-helpers.js";
import { prisma } from "../lib/prisma.js";

// --- Plan Configuration ---

const PLANS = {
  starter: {
    name: "Starter",
    price: 49,
    priceId: process.env.STRIPE_PRICE_STARTER || "price_starter",
    limits: { properties: 50, voiceMinutes: 100, teamMembers: 3 },
    features: ["Up to 50 properties", "100 voice minutes/month", "3 team members", "Basic analytics", "Email support"],
  },
  growth: {
    name: "Growth",
    price: 149,
    priceId: process.env.STRIPE_PRICE_GROWTH || "price_growth",
    limits: { properties: 250, voiceMinutes: 500, teamMembers: 10 },
    features: ["Up to 250 properties", "500 voice minutes/month", "10 team members", "Advanced analytics", "CRM webhooks", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    price: 399,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || "price_enterprise",
    limits: { properties: -1, voiceMinutes: -1, teamMembers: -1 },
    features: ["Unlimited properties", "Unlimited voice minutes", "Unlimited team members", "Custom branding", "Custom domain", "API access", "Dedicated support", "SLA guarantee"],
  },
} as const;

// --- Helper ---

async function verifyAgencyAdmin(userId: string, agencyId: string) {
  const member = await prisma.agencyMember.findFirst({
    where: { userId, agencyId, role: "admin" },
  });
  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return member;
}

// --- Router ---

export const billingRouter = router({
  /** Get available plans */
  plans: publicProcedure.query(() => {
    return Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
    }));
  }),

  /** Get agency billing info */
  info: protectedProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      await verifyAgencyAdmin(ctx.userId, input.agencyId);

      const agency = await prisma.agency.findUnique({
        where: { id: input.agencyId },
        include: { subscription: true },
      });

      if (!agency) throw new TRPCError({ code: "NOT_FOUND" });

      const plan = PLANS[agency.plan] || PLANS.starter;
      const usage = {
        properties: { used: agency.propertyCount, limit: plan.limits.properties },
        voiceMinutes: { used: agency.voiceMinutes, limit: plan.limits.voiceMinutes },
        teamMembers: {
          used: await prisma.agencyMember.count({ where: { agencyId: input.agencyId } }),
          limit: plan.limits.teamMembers,
        },
      };

      return {
        plan: { id: agency.plan, ...plan },
        subscription: agency.subscription,
        usage,
        billingEmail: agency.billingEmail,
      };
    }),

  /** Create Stripe Checkout session (mock) */
  createCheckout: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      planId: z.enum(["starter", "growth", "enterprise"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await verifyAgencyAdmin(ctx.userId, input.agencyId);

      const plan = PLANS[input.planId];

      // In production: create Stripe Checkout session
      // const session = await stripe.checkout.sessions.create({ ... });

      // Mock checkout URL
      const checkoutUrl = `https://checkout.stripe.com/mock?plan=${input.planId}&agency=${input.agencyId}`;

      return { url: checkoutUrl, planId: input.planId };
    }),

  /** Handle Stripe webhook (called from REST endpoint) */
  handleStripeEvent: publicProcedure
    .input(z.object({
      rawBody: z.string(),
      signature: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { rawBody, signature } = input;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!endpointSecret) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe webhook secret not configured",
        });
      }

      // Verify the Stripe webhook signature
      let event: { type: string; data: { object: Record<string, unknown> } };
      try {
        // Use Stripe's signature verification algorithm:
        // Compare HMAC-SHA256(endpointSecret, timestamp.rawBody) with provided signatures
        const crypto = await import("node:crypto");
        const parts = signature.split(",");
        const timestampPart = parts.find((p) => p.startsWith("t="));
        const sigParts = parts.filter((p) => p.startsWith("v1="));

        if (!timestampPart || sigParts.length === 0) {
          throw new Error("Invalid signature format");
        }

        const timestamp = timestampPart.slice(2);
        const signedPayload = `${timestamp}.${rawBody}`;
        const expectedSig = crypto
          .createHmac("sha256", endpointSecret)
          .update(signedPayload)
          .digest("hex");

        const isValid = sigParts.some((s) => {
          const sig = s.slice(3); // strip "v1="
          return crypto.timingSafeEqual(
            Buffer.from(expectedSig, "hex"),
            Buffer.from(sig, "hex")
          );
        });

        if (!isValid) {
          throw new Error("Signature verification failed");
        }

        // Check timestamp tolerance (5 minutes)
        const eventTime = parseInt(timestamp, 10);
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - eventTime) > 300) {
          throw new Error("Webhook timestamp too old");
        }

        event = JSON.parse(rawBody);
      } catch (err: any) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Stripe webhook signature verification failed: ${err.message}`,
        });
      }

      const { type, data } = event;

      switch (type) {
        case "invoice.paid": {
          const agencyId = (data.object as any).metadata?.agencyId;
          if (agencyId) {
            await prisma.subscription.updateMany({
              where: { agencyId },
              data: { status: "active" },
            });
          }
          break;
        }

        case "customer.subscription.updated": {
          const agencyId = (data.object as any).metadata?.agencyId;
          const status = (data.object as any).status;
          if (agencyId) {
            await prisma.subscription.updateMany({
              where: { agencyId },
              data: {
                status: status === "active" ? "active" : status === "past_due" ? "past_due" : "cancelled",
              },
            });
          }
          break;
        }

        case "customer.subscription.deleted": {
          const agencyId = (data.object as any).metadata?.agencyId;
          if (agencyId) {
            await prisma.subscription.updateMany({
              where: { agencyId },
              data: { status: "cancelled", cancelledAt: new Date() },
            });
            await prisma.agency.update({
              where: { id: agencyId },
              data: { plan: "starter" },
            });
          }
          break;
        }
      }

      return { received: true };
    }),

  /** Record usage (voice minutes) — admin/agent only */
  recordUsage: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      voiceMinutes: z.number().min(0).optional(),
      conversations: z.number().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only agency admins or agents can record usage
      const member = await prisma.agencyMember.findFirst({
        where: { userId: ctx.userId, agencyId: input.agencyId, role: { in: ["admin", "agent"] } },
      });
      if (!member) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins or agents can record usage" });
      }

      const updates: any = {};
      if (input.voiceMinutes) {
        updates.voiceMinutes = { increment: input.voiceMinutes };
      }
      if (input.conversations) {
        updates.conversationCount = { increment: input.conversations };
      }

      await prisma.agency.update({
        where: { id: input.agencyId },
        data: updates,
      });

      return { success: true };
    }),

  /** Get mock invoices */
  invoices: protectedProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      await verifyAgencyAdmin(ctx.userId, input.agencyId);

      // Mock invoices
      return [
        { id: "inv_001", date: "2024-03-01", amount: 4900, status: "paid", plan: "Starter" },
        { id: "inv_002", date: "2024-02-01", amount: 4900, status: "paid", plan: "Starter" },
        { id: "inv_003", date: "2024-01-01", amount: 4900, status: "paid", plan: "Starter" },
      ];
    }),
});
