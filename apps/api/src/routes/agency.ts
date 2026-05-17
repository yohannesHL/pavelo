/**
 * Agency tRPC routes (S9-01, S9-02, S9-03, S9-04, S9-05, S9-06)
 *
 * Provides agency management, lead pipeline, analytics,
 * handover, webhooks, white-label config, and multi-tenancy.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { router, protectedProcedure } from "../router-helpers.js";
import { prisma } from "../lib/prisma.js";

// --- Helper: verify agency membership ---

async function verifyAgencyMember(userId: string, agencyId?: string) {
  const where: Prisma.AgencyMemberWhereInput = { userId };
  if (agencyId) where.agencyId = agencyId;

  const member = await prisma.agencyMember.findFirst({ where });
  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this agency" });
  }
  return member;
}

async function verifyAgencyAdmin(userId: string, agencyId: string) {
  const member = await verifyAgencyMember(userId, agencyId);
  if (member.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return member;
}

// --- Schemas ---

const LeadStatusEnum = z.enum(["new", "contacted", "qualified", "converted", "lost"]);

const HandoverStatusEnum = z.enum(["pending", "accepted", "in_progress", "completed"]);

const WebhookEventEnum = z.enum([
  "lead.created",
  "viewing.booked",
  "valuation.requested",
  "handover.requested",
]);

// --- Router ---

export const agencyRouter = router({
  // ═══════════════════════════════════════════
  // S9-06: Agency CRUD & Multi-tenancy
  // ═══════════════════════════════════════════

  /** Create a new agency */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      billingEmail: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const agency = await prisma.agency.create({
        data: {
          name: input.name,
          slug,
          billingEmail: input.billingEmail,
          members: {
            create: {
              userId: ctx.userId,
              role: "admin",
              name: ctx.userEmail || "Admin",
              email: input.billingEmail,
              joinedAt: new Date(),
            },
          },
        },
        include: { members: true },
      });

      return agency;
    }),

  /** Get current user's agency */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const member = await prisma.agencyMember.findFirst({
      where: { userId: ctx.userId },
      include: {
        agency: {
          include: {
            config: true,
            _count: {
              select: {
                members: true,
                leads: true,
                webhooks: true,
              },
            },
          },
        },
      },
    });

    if (!member) return null;
    return { ...member.agency, memberRole: member.role };
  }),

  // ═══════════════════════════════════════════
  // S9-01: Dashboard KPIs
  // ═══════════════════════════════════════════

  /** Dashboard KPIs */
  dashboardKpis: protectedProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      await verifyAgencyMember(ctx.userId, input.agencyId);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        memberCount,
        totalLeads,
        leadsThisMonth,
        convertedLeads,
        propertyCount,
        activeConversations,
        pendingHandovers,
        viewingBookings,
      ] = await Promise.all([
        prisma.agencyMember.count({ where: { agencyId: input.agencyId } }),
        prisma.lead.count({ where: { agencyId: input.agencyId } }),
        prisma.lead.count({ where: { agencyId: input.agencyId, createdAt: { gte: monthStart } } }),
        prisma.lead.count({ where: { agencyId: input.agencyId, status: "converted" } }),
        prisma.agency.findUnique({ where: { id: input.agencyId }, select: { propertyCount: true } }),
        prisma.agency.findUnique({ where: { id: input.agencyId }, select: { conversationCount: true } }),
        prisma.handover.count({ where: { agencyId: input.agencyId, status: "pending" } }),
        prisma.agency.findUnique({ where: { id: input.agencyId }, select: { voiceMinutes: true } }),
      ]);

      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

      return {
        teamMembers: memberCount,
        propertiesListed: propertyCount?.propertyCount ?? 0,
        activeConversations: activeConversations?.conversationCount ?? 0,
        leadsThisMonth,
        totalLeads,
        conversionRate,
        pendingHandovers,
        voiceMinutes: viewingBookings?.voiceMinutes ?? 0,
      };
    }),

  // ═══════════════════════════════════════════
  // S9-01: Lead Pipeline
  // ═══════════════════════════════════════════

  /** List leads */
  listLeads: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      status: LeadStatusEnum.optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
    }))
    .query(async ({ input, ctx }) => {
      await verifyAgencyMember(ctx.userId, input.agencyId);

      const where: Prisma.LeadWhereInput = { agencyId: input.agencyId };
      if (input.status) where.status = input.status;

      const items = await prisma.lead.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | null = null;
      if (items.length > input.limit) {
        nextCursor = items.pop()!.id;
      }

      return { items, nextCursor };
    }),

  /** Create a lead */
  createLead: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      source: z.string().default("manual"),
      propertyId: z.string().uuid().optional(),
      notes: z.string().optional(),
      budget: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await verifyAgencyMember(ctx.userId, input.agencyId);

      const lead = await prisma.lead.create({
        data: {
          agencyId: input.agencyId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          source: input.source,
          propertyId: input.propertyId,
          notes: input.notes,
          budget: input.budget,
        },
      });

      return lead;
    }),

  /** Update lead status */
  updateLeadStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: LeadStatusEnum,
    }))
    .mutation(async ({ input, ctx }) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.id } });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

      await verifyAgencyMember(ctx.userId, lead.agencyId);

      return prisma.lead.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  // ═══════════════════════════════════════════
  // S9-01: Team Management
  // ═══════════════════════════════════════════

  /** List team members */
  listMembers: protectedProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      await verifyAgencyMember(ctx.userId, input.agencyId);

      return prisma.agencyMember.findMany({
        where: { agencyId: input.agencyId },
        orderBy: { createdAt: "asc" },
      });
    }),

  /** Invite a new team member */
  inviteMember: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["admin", "agent", "viewer"]).default("agent"),
    }))
    .mutation(async ({ input, ctx }) => {
      await verifyAgencyAdmin(ctx.userId, input.agencyId);

      // Check if already a member
      const existing = await prisma.agencyMember.findFirst({
        where: { agencyId: input.agencyId, email: input.email },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "User already invited" });
      }

      const member = await prisma.agencyMember.create({
        data: {
          agencyId: input.agencyId,
          userId: input.email, // placeholder until they accept
          role: input.role,
          name: input.name,
          email: input.email,
          invitedAt: new Date(),
        },
      });

      return member;
    }),

  /** Remove a team member */
  removeMember: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      memberId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      await verifyAgencyAdmin(ctx.userId, input.agencyId);

      await prisma.agencyMember.delete({ where: { id: input.memberId } });
      return { success: true };
    }),

  // ═══════════════════════════════════════════
  // S9-02: Conversation Analytics
  // ═══════════════════════════════════════════

  /** Analytics data */
  analytics: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      await verifyAgencyMember(ctx.userId, input.agencyId);

      const endDate = input.endDate ? new Date(input.endDate) : new Date();
      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get leads for pipeline analytics
      const leads = await prisma.lead.findMany({
        where: {
          agencyId: input.agencyId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: "asc" },
      });

      // Message volume over time (grouped by day)
      const days: Record<string, number> = {};
      let cursor = new Date(startDate);
      while (cursor <= endDate) {
        days[cursor.toISOString().split("T")[0]] = 0;
        cursor = new Date(cursor.getTime() + 86400000);
      }

      // Simulate message counts from leads (in production, query messages by agencyId)
      for (const lead of leads) {
        const day = lead.createdAt.toISOString().split("T")[0];
        if (days[day] !== undefined) days[day]++;
      }

      const messageVolume = Object.entries(days).map(([date, count]) => ({ date, count }));

      // Intent distribution from leads
      const sourceDistribution = leads.reduce((acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const intentDistribution = Object.entries(sourceDistribution).map(([name, value]) => ({ name, value }));

      // Lead status distribution
      const statusDistribution = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Feedback aggregation — scoped to agency members
      const agencyMembers = await prisma.agencyMember.findMany({
        where: { agencyId: input.agencyId },
        select: { userId: true },
      });
      const memberUserIds = agencyMembers.map((m) => m.userId);

      const feedbacks = await prisma.feedback.findMany({
        where: { createdAt: { gte: startDate, lte: endDate }, userId: { in: memberUserIds } },
      });

      const thumbsUp = feedbacks.filter((f) => f.rating >= 4).length;
      const thumbsDown = feedbacks.filter((f) => f.rating <= 2).length;
      const satisfactionRate = feedbacks.length > 0
        ? Math.round((thumbsUp / feedbacks.length) * 100)
        : 0;

      // Top queries from search events in this period
      const searchEvents = await prisma.searchEvent.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        take: 500,
        orderBy: { createdAt: "desc" },
      });

      const queryFreq: Record<string, number> = {};
      for (const e of searchEvents) {
        const q = e.query.toLowerCase().trim();
        queryFreq[q] = (queryFreq[q] || 0) + 1;
      }
      const topQueries = Object.entries(queryFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));

      return {
        period: { start: startDate.toISOString(), end: endDate.toISOString() },
        messageVolume,
        intentDistribution,
        statusDistribution,
        satisfaction: { thumbsUp, thumbsDown, total: feedbacks.length, rate: satisfactionRate },
        topQueries,
        totalLeads: leads.length,
        totalConversations: searchEvents.length,
      };
    }),

  // ═══════════════════════════════════════════
  // S9-03: Human Agent Handover
  // ═══════════════════════════════════════════

  /** Request a handover */
  requestHandover: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      conversationId: z.string().uuid(),
      reason: z.string(),
      contextSummary: z.string().optional(),
      userPreferences: z.record(z.unknown()).optional(),
      propertiesDiscussed: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify the requesting user belongs to this agency
      await verifyAgencyMember(ctx.userId, input.agencyId);

      const handover = await prisma.handover.create({
        data: {
          agencyId: input.agencyId,
          conversationId: input.conversationId,
          userId: ctx.userId,
          reason: input.reason,
          contextSummary: input.contextSummary,
          userPreferences: input.userPreferences || {},
          propertiesDiscussed: input.propertiesDiscussed || [],
        },
      });

      return handover;
    }),

  /** List handovers */
  listHandovers: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      status: HandoverStatusEnum.optional(),
    }))
    .query(async ({ input, ctx }) => {
      await verifyAgencyMember(ctx.userId, input.agencyId);

      const where: Prisma.HandoverWhereInput = { agencyId: input.agencyId };
      if (input.status) where.status = input.status;

      return prisma.handover.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  /** Accept a handover */
  acceptHandover: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const handover = await prisma.handover.findUnique({ where: { id: input.id } });
      if (!handover) throw new TRPCError({ code: "NOT_FOUND" });

      await verifyAgencyMember(ctx.userId, handover.agencyId);

      return prisma.handover.update({
        where: { id: input.id },
        data: {
          status: "accepted",
          assignedTo: ctx.userId,
          acceptedAt: new Date(),
        },
      });
    }),

  /** Complete a handover */
  completeHandover: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const handover = await prisma.handover.findUnique({ where: { id: input.id } });
      if (!handover) throw new TRPCError({ code: "NOT_FOUND" });

      await verifyAgencyMember(ctx.userId, handover.agencyId);

      return prisma.handover.update({
        where: { id: input.id },
        data: { status: "completed", completedAt: new Date() },
      });
    }),

  // ═══════════════════════════════════════════
  // S9-04: CRM Webhooks
  // ═══════════════════════════════════════════

  /** List webhook configs */
  listWebhooks: protectedProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      await verifyAgencyAdmin(ctx.userId, input.agencyId);

      return prisma.webhookConfig.findMany({
        where: { agencyId: input.agencyId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          agencyId: true,
          url: true,
          events: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          // secret is intentionally excluded — never expose webhook secrets
        },
      });
    }),

  /** Create webhook config */
  createWebhook: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      url: z.string().url(),
      secret: z.string().min(16),
      events: z.array(WebhookEventEnum).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      await verifyAgencyAdmin(ctx.userId, input.agencyId);

      return prisma.webhookConfig.create({
        data: {
          agencyId: input.agencyId,
          url: input.url,
          secret: input.secret,
          events: input.events,
        },
      });
    }),

  /** Update webhook config */
  updateWebhook: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      url: z.string().url().optional(),
      events: z.array(WebhookEventEnum).optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const webhook = await prisma.webhookConfig.findUnique({ where: { id: input.id } });
      if (!webhook) throw new TRPCError({ code: "NOT_FOUND" });

      await verifyAgencyAdmin(ctx.userId, webhook.agencyId);

      return prisma.webhookConfig.update({
        where: { id: input.id },
        data: {
          ...(input.url && { url: input.url }),
          ...(input.events && { events: input.events }),
          ...(input.active !== undefined && { active: input.active }),
        },
      });
    }),

  /** Delete webhook config */
  deleteWebhook: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const webhook = await prisma.webhookConfig.findUnique({ where: { id: input.id } });
      if (!webhook) throw new TRPCError({ code: "NOT_FOUND" });

      await verifyAgencyAdmin(ctx.userId, webhook.agencyId);

      await prisma.webhookConfig.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /** Webhook delivery log */
  webhookDeliveries: protectedProcedure
    .input(z.object({
      webhookId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const webhook = await prisma.webhookConfig.findUnique({ where: { id: input.webhookId } });
      if (!webhook) throw new TRPCError({ code: "NOT_FOUND" });

      await verifyAgencyMember(ctx.userId, webhook.agencyId);

      return prisma.webhookDelivery.findMany({
        where: { webhookId: input.webhookId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  // ═══════════════════════════════════════════
  // S9-05: White-label Configuration
  // ═══════════════════════════════════════════

  /** Get agency config (branding) */
  getConfig: protectedProcedure
    .input(z.object({ agencyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      await verifyAgencyMember(ctx.userId, input.agencyId);

      let config = await prisma.agencyConfig.findUnique({
        where: { agencyId: input.agencyId },
      });

      if (!config) {
        config = await prisma.agencyConfig.create({
          data: { agencyId: input.agencyId },
        });
      }

      return config;
    }),

  /** Update agency branding */
  updateConfig: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      logo: z.string().url().optional().nullable(),
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      personaName: z.string().min(1).max(50).optional(),
      customDomain: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      await verifyAgencyAdmin(ctx.userId, input.agencyId);

      const { agencyId, ...data } = input;

      return prisma.agencyConfig.upsert({
        where: { agencyId },
        update: data,
        create: { agencyId, ...data },
      });
    }),

  // ═══════════════════════════════════════════
  // S9-08: Feedback
  // ═══════════════════════════════════════════

  /** Submit feedback on a message */
  submitFeedback: protectedProcedure
    .input(z.object({
      messageId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      correction: z.string().optional(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return prisma.feedback.upsert({
        where: {
          messageId_userId: {
            messageId: input.messageId,
            userId: ctx.userId,
          },
        },
        update: {
          rating: input.rating,
          correction: input.correction,
          comment: input.comment,
        },
        create: {
          messageId: input.messageId,
          userId: ctx.userId,
          rating: input.rating,
          correction: input.correction,
          comment: input.comment,
        },
      });
    }),

  /** List feedback (for analytics/export) */
  listFeedback: protectedProcedure
    .input(z.object({
      agencyId: z.string().uuid(),
      limit: z.number().min(1).max(500).default(100),
      ratingFilter: z.number().int().min(1).max(5).optional(),
      format: z.enum(["json", "jsonl"]).default("json"),
    }))
    .query(async ({ input, ctx }) => {
      // Verify membership and scope to agency tenant
      await verifyAgencyMember(ctx.userId, input.agencyId);

      const agencyMembers = await prisma.agencyMember.findMany({
        where: { agencyId: input.agencyId },
        select: { userId: true },
      });
      const memberUserIds = agencyMembers.map((m) => m.userId);

      const where: Prisma.FeedbackWhereInput = { userId: { in: memberUserIds } };
      if (input.ratingFilter) where.rating = input.ratingFilter;

      const feedbacks = await prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      if (input.format === "jsonl") {
        // Export as JSONL for fine-tuning
        const lines = feedbacks.map((f) =>
          JSON.stringify({
            message_id: f.messageId,
            rating: f.rating,
            correction: f.correction,
            comment: f.comment,
            timestamp: f.createdAt.toISOString(),
          })
        );
        return { format: "jsonl", data: lines.join("\n"), count: feedbacks.length };
      }

      return { format: "json", data: feedbacks, count: feedbacks.length };
    }),
});
