/**
 * Conversation tRPC routes (S5-03)
 *
 * Provides CRUD operations for conversations and messages:
 * - Create, list, get, delete conversations
 * - Add messages and load history with pagination
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../router-helpers.js";
import { prisma } from "../lib/prisma.js";

// --- Schemas ---

const CreateConversationInput = z.object({
  title: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const AddMessageInput = z.object({
  conversationId: z.string().uuid(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string().min(1).max(50000),
  metadata: z.record(z.unknown()).optional(),
  visualPayloads: z.array(z.record(z.unknown())).optional(),
});

const ListMessagesInput = z.object({
  conversationId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
});

// --- Router ---

export const conversationRouter = router({
  /** Create a new conversation */
  create: protectedProcedure
    .input(CreateConversationInput)
    .mutation(async ({ input, ctx }) => {
      const conversation = await prisma.conversation.create({
        data: {
          userId: ctx.userId,
          title: input.title,
          metadata: input.metadata || {},
        },
      });
      return conversation;
    }),

  /** List user's conversations (most recent first) */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, cursor } = input;

      const conversations = await prisma.conversation.findMany({
        where: {
          userId: ctx.userId,
          deletedAt: null,
        },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: {
              content: true,
              role: true,
              createdAt: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      let nextCursor: string | null = null;
      if (conversations.length > limit) {
        const next = conversations.pop()!;
        nextCursor = next.id;
      }

      return {
        items: conversations.map((c) => ({
          id: c.id,
          title: c.title,
          metadata: c.metadata,
          firstMessage: c.messages[0] || null,
          messageCount: c._count.messages,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        nextCursor,
      };
    }),

  /** Get a single conversation with its messages */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          deletedAt: null,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 50,
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return conversation;
    }),

  /** Soft-delete a conversation */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.conversation.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          deletedAt: null,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      await prisma.conversation.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),

  /** Add a message to a conversation */
  addMessage: protectedProcedure
    .input(AddMessageInput)
    .mutation(async ({ input, ctx }) => {
      // Verify the user owns this conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          userId: ctx.userId,
          deletedAt: null,
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const message = await prisma.message.create({
        data: {
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          metadata: input.metadata || {},
          visualPayloads: input.visualPayloads || [],
        },
      });

      // Touch the conversation's updatedAt
      await prisma.conversation.update({
        where: { id: input.conversationId },
        data: {
          // If no title yet, set from first user message
          ...(conversation.title
            ? {}
            : input.role === "user"
              ? { title: input.content.slice(0, 100) }
              : {}),
        },
      });

      return message;
    }),

  /** Load messages with cursor pagination */
  messages: protectedProcedure
    .input(ListMessagesInput)
    .query(async ({ input, ctx }) => {
      const { conversationId, limit, cursor, order } = input;

      // Verify ownership
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: ctx.userId,
          deletedAt: null,
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const messages = await prisma.message.findMany({
        where: { conversationId },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: order },
      });

      let nextCursor: string | null = null;
      if (messages.length > limit) {
        const next = messages.pop()!;
        nextCursor = next.id;
      }

      return {
        items: messages,
        nextCursor,
        total: await prisma.message.count({ where: { conversationId } }),
      };
    }),

  /** Search conversations by message content */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      // Find conversations that contain messages matching the query
      const conversations = await prisma.conversation.findMany({
        where: {
          userId: ctx.userId,
          deletedAt: null,
          OR: [
            { title: { contains: input.query, mode: "insensitive" } },
            {
              messages: {
                some: {
                  content: { contains: input.query, mode: "insensitive" },
                },
              },
            },
          ],
        },
        take: input.limit,
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: { content: true, role: true, createdAt: true },
          },
          _count: { select: { messages: true } },
        },
      });

      return conversations.map((c) => ({
        id: c.id,
        title: c.title,
        firstMessage: c.messages[0] || null,
        messageCount: c._count.messages,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));
    }),
});
