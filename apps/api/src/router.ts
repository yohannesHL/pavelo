import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./context.js";
import { prisma } from "./lib/prisma.js";
import { router, publicProcedure, protectedProcedure } from "./router-helpers.js";
import { conversationRouter } from "./routes/conversation.js";
import { voiceRouter } from "./routes/voice.js";

// --- Zod Schemas ---

const PropertyTypeEnum = z.enum([
  "detached",
  "semi_detached",
  "terraced",
  "flat",
  "bungalow",
  "cottage",
  "mansion",
  "other",
]);

const PropertyStatusEnum = z.enum([
  "for_sale",
  "under_offer",
  "sold_stc",
  "sold",
  "withdrawn",
]);

const TenureEnum = z.enum(["freehold", "leasehold", "share_of_freehold"]);

const SortFieldEnum = z.enum([
  "price",
  "createdAt",
  "bedrooms",
  "squareFeet",
]);

const SortOrderEnum = z.enum(["asc", "desc"]);

const CreatePropertyInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().int().min(0),
  propertyType: PropertyTypeEnum,
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().int().min(0).max(10),
  squareFeet: z.number().int().min(0).optional(),
  yearBuilt: z.number().int().min(1600).max(2030).optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  county: z.string().optional(),
  country: z.string().default("UK"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  images: z.array(z.string().url()).default([]),
  features: z.array(z.string()).default([]),
  epcRating: z.string().max(5).optional(),
  tenure: TenureEnum.optional(),
  councilTaxBand: z.string().max(2).optional(),
});

const UpdatePropertyInput = CreatePropertyInput.partial().extend({
  status: PropertyStatusEnum.optional(),
});

const ListPropertyInput = z.object({
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
  // Filters
  query: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  propertyType: PropertyTypeEnum.optional(),
  minBedrooms: z.number().min(0).optional(),
  maxBedrooms: z.number().min(0).optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  status: PropertyStatusEnum.optional(),
  // Sorting
  sortBy: SortFieldEnum.default("createdAt"),
  sortOrder: SortOrderEnum.default("desc"),
});

// --- Router ---

export const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),

  /** Hybrid search: text query + optional structured filters → ranked results (S4-04) */
  search: router({
    /** Full hybrid search with query decomposition */
    query: publicProcedure
      .input(
        z.object({
          query: z.string().min(1).max(500),
          filters: z.object({
            minPrice: z.number().min(0).optional(),
            maxPrice: z.number().min(0).optional(),
            minBedrooms: z.number().min(0).optional(),
            maxBedrooms: z.number().min(0).max(20).optional(),
            propertyType: PropertyTypeEnum.optional(),
            city: z.string().optional(),
            postcode: z.string().optional(),
            status: PropertyStatusEnum.optional(),
            latitude: z.number().min(-90).max(90).optional(),
            longitude: z.number().min(-180).max(180).optional(),
            radiusKm: z.number().min(0).max(100).optional(),
          }).optional(),
          topK: z.number().min(1).max(100).default(20),
          cursor: z.number().min(0).default(0),
          sortBy: z.enum(["relevance", "price_asc", "price_desc", "newest", "bedrooms"]).default("relevance"),
          excludeIds: z.array(z.string()).optional(),
        })
      )
      .query(async ({ input }) => {
        const { query, filters, topK, cursor, sortBy, excludeIds } = input;

        // Call ML service hybrid search
        const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8001";

        const searchBody: Record<string, any> = {
          query,
          top_k: topK + cursor + 1, // fetch enough for pagination
          exclude_ids: excludeIds,
        };

        if (filters) {
          searchBody.filters = {
            min_price: filters.minPrice,
            max_price: filters.maxPrice,
            min_bedrooms: filters.minBedrooms,
            max_bedrooms: filters.maxBedrooms,
            property_type: filters.propertyType,
            city: filters.city,
            postcode: filters.postcode,
            status: filters.status,
            latitude: filters.latitude,
            longitude: filters.longitude,
            radius_km: filters.radiusKm,
          };
        }

        try {
          const mlResponse = await fetch(`${mlServiceUrl}/api/v1/search/hybrid`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(searchBody),
          });

          if (!mlResponse.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `ML service error: ${mlResponse.status}`,
            });
          }

          const mlData = await mlResponse.json();
          const searchResults = mlData.results || [];

          // Extract property IDs for hydration
          const propertyIds = searchResults.map((r: any) => r.id);

          // Hydrate from PostgreSQL
          let properties: any[] = [];
          if (propertyIds.length > 0) {
            properties = await prisma.property.findMany({
              where: {
                id: { in: propertyIds },
                deletedAt: null,
              },
              include: {
                owner: { select: { id: true, name: true, email: true } },
              },
            });
          }

          // Create a lookup map
          const propertyMap = new Map(properties.map((p) => [p.id, p]));

          // Merge search scores with full property data, preserving search order
          let items = searchResults
            .map((result: any) => {
              const property = propertyMap.get(result.id);
              if (!property) return null;
              return {
                ...property,
                searchScore: result.score,
                denseRank: result.dense_rank,
                sparseRank: result.sparse_rank,
              };
            })
            .filter(Boolean);

          // Apply sort if not relevance (relevance = search score order)
          if (sortBy === "price_asc") {
            items.sort((a: any, b: any) => a.price - b.price);
          } else if (sortBy === "price_desc") {
            items.sort((a: any, b: any) => b.price - a.price);
          } else if (sortBy === "newest") {
            items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          } else if (sortBy === "bedrooms") {
            items.sort((a: any, b: any) => b.bedrooms - a.bedrooms);
          }

          // Paginate
          const paginatedItems = items.slice(cursor, cursor + topK);
          const hasMore = items.length > cursor + topK;

          return {
            items: paginatedItems,
            nextCursor: hasMore ? cursor + topK : null,
            total: items.length,
            query: mlData.query,
            filtersApplied: mlData.filters_applied || {},
          };
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;

          // Fallback to PostgreSQL text search if ML service is unavailable
          const where: any = { deletedAt: null };
          if (query) {
            where.OR = [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { city: { contains: query, mode: "insensitive" } },
              { postcode: { contains: query, mode: "insensitive" } },
            ];
          }
          if (filters?.minPrice) where.price = { ...where.price, gte: filters.minPrice };
          if (filters?.maxPrice) where.price = { ...where.price, lte: filters.maxPrice };
          if (filters?.propertyType) where.propertyType = filters.propertyType;
          if (filters?.minBedrooms) where.bedrooms = { ...where.bedrooms, gte: filters.minBedrooms };
          if (filters?.city) where.city = { contains: filters.city, mode: "insensitive" };

          const items = await prisma.property.findMany({
            where,
            take: topK,
            skip: cursor,
            orderBy: { createdAt: "desc" },
            include: { owner: { select: { id: true, name: true, email: true } } },
          });

          return {
            items: items.map((p) => ({ ...p, searchScore: null, denseRank: null, sparseRank: null })),
            nextCursor: items.length === topK ? cursor + topK : null,
            total: await prisma.property.count({ where }),
            query,
            filtersApplied: {},
          };
        }
      }),
  }),

  property: router({
    /** List properties with pagination, filtering, and sorting */
    list: publicProcedure
      .input(ListPropertyInput)
      .query(async ({ input }) => {
        const {
          limit,
          cursor,
          query,
          minPrice,
          maxPrice,
          propertyType,
          minBedrooms,
          maxBedrooms,
          city,
          postcode,
          status,
          sortBy,
          sortOrder,
        } = input;

        // Build where clause
        const where: any = {
          deletedAt: null,
        };

        if (query) {
          where.OR = [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
            { postcode: { contains: query, mode: "insensitive" } },
          ];
        }
        if (minPrice !== undefined || maxPrice !== undefined) {
          where.price = {};
          if (minPrice !== undefined) where.price.gte = minPrice;
          if (maxPrice !== undefined) where.price.lte = maxPrice;
        }
        if (propertyType) where.propertyType = propertyType;
        if (minBedrooms !== undefined || maxBedrooms !== undefined) {
          where.bedrooms = {};
          if (minBedrooms !== undefined) where.bedrooms.gte = minBedrooms;
          if (maxBedrooms !== undefined) where.bedrooms.lte = maxBedrooms;
        }
        if (city) where.city = { contains: city, mode: "insensitive" };
        if (postcode)
          where.postcode = { contains: postcode, mode: "insensitive" };
        if (status) where.status = status;

        const items = await prisma.property.findMany({
          where,
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          orderBy: { [sortBy]: sortOrder },
          include: { owner: { select: { id: true, name: true, email: true } } },
        });

        let nextCursor: string | null = null;
        if (items.length > limit) {
          const next = items.pop()!;
          nextCursor = next.id;
        }

        return {
          items,
          nextCursor,
          total: await prisma.property.count({ where }),
        };
      }),

    /** Get single property by ID */
    get: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        const property = await prisma.property.findFirst({
          where: { id: input.id, deletedAt: null },
          include: { owner: { select: { id: true, name: true, email: true } } },
        });

        if (!property) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Property not found",
          });
        }

        return property;
      }),

    /** Create a new property */
    create: protectedProcedure
      .input(CreatePropertyInput)
      .mutation(async ({ input, ctx }) => {
        const property = await prisma.property.create({
          data: {
            ...input,
            ownerId: ctx.userId,
          },
        });
        return property;
      }),

    /** Update an existing property */
    update: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          data: UpdatePropertyInput,
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Verify ownership
        const existing = await prisma.property.findFirst({
          where: { id: input.id, deletedAt: null },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Property not found",
          });
        }

        if (existing.ownerId !== ctx.userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update your own properties",
          });
        }

        const updated = await prisma.property.update({
          where: { id: input.id },
          data: input.data,
        });
        return updated;
      }),

    /** Soft-delete a property */
    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await prisma.property.findFirst({
          where: { id: input.id, deletedAt: null },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Property not found",
          });
        }

        if (existing.ownerId !== ctx.userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete your own properties",
          });
        }

        await prisma.property.update({
          where: { id: input.id },
          data: { deletedAt: new Date() },
        });

        return { success: true };
      }),
  }),

  /** Saved searches — save, list, delete (S4-07) */
  savedSearch: router({
    /** Save a search */
    save: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100).default("Untitled Search"),
          query: z.string().min(1),
          filters: z.record(z.any()).default({}),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const saved = await prisma.savedSearch.create({
          data: {
            userId: ctx.userId,
            name: input.name,
            query: input.query,
            filters: input.filters,
          },
        });
        return saved;
      }),

    /** List user's saved searches */
    list: protectedProcedure.query(async ({ ctx }) => {
      return prisma.savedSearch.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
      });
    }),

    /** Delete a saved search */
    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await prisma.savedSearch.findFirst({
          where: { id: input.id, userId: ctx.userId },
        });
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Saved search not found" });
        }
        await prisma.savedSearch.delete({ where: { id: input.id } });
        return { success: true };
      }),

    /** Toggle active status */
    toggle: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await prisma.savedSearch.findFirst({
          where: { id: input.id, userId: ctx.userId },
        });
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Saved search not found" });
        }
        return prisma.savedSearch.update({
          where: { id: input.id },
          data: { isActive: !existing.isActive },
        });
      }),
  }),

  /** Conversations — create, list, manage chat sessions (S5-03) */
  conversation: conversationRouter,

  /** Voice sessions — create, manage, monitor voice calls (S6-01, S6-07) */
  voice: voiceRouter,

  /** Search analytics (S4-09) */
  searchAnalytics: router({
    /** Log a search event */
    log: publicProcedure
      .input(
        z.object({
          query: z.string(),
          filters: z.record(z.any()).default({}),
          resultCount: z.number().min(0).default(0),
          source: z.enum(["web", "agent", "api"]).default("web"),
          durationMs: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await prisma.searchEvent.create({
          data: {
            userId: (ctx as any).userId || null,
            query: input.query,
            filters: input.filters,
            resultCount: input.resultCount,
            source: input.source,
            durationMs: input.durationMs,
          },
        });
        return { logged: true };
      }),

    /** Record a click-through on a search result */
    click: publicProcedure
      .input(
        z.object({
          eventId: z.string().uuid(),
          propertyId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const event = await prisma.searchEvent.findUnique({
          where: { id: input.eventId },
        });
        if (!event) return { success: false };

        await prisma.searchEvent.update({
          where: { id: input.eventId },
          data: {
            clickedIds: [...event.clickedIds, input.propertyId],
          },
        });
        return { success: true };
      }),

    /** Analytics summary — top queries, avg results, CTR (S4-09) */
    summary: publicProcedure
      .input(
        z.object({
          days: z.number().min(1).max(90).default(30),
        })
      )
      .query(async ({ input }) => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);

        const events = await prisma.searchEvent.findMany({
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
        });

        const totalSearches = events.length;
        const avgResults =
          totalSearches > 0
            ? events.reduce((sum, e) => sum + e.resultCount, 0) / totalSearches
            : 0;
        const zeroResultCount = events.filter((e) => e.resultCount === 0).length;
        const clickEvents = events.filter((e) => e.clickedIds.length > 0).length;
        const ctr = totalSearches > 0 ? clickEvents / totalSearches : 0;

        // Top queries by frequency
        const queryFreq: Record<string, number> = {};
        for (const e of events) {
          const q = e.query.toLowerCase().trim();
          queryFreq[q] = (queryFreq[q] || 0) + 1;
        }
        const topQueries = Object.entries(queryFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([query, count]) => ({ query, count }));

        return {
          totalSearches,
          avgResults: Math.round(avgResults * 10) / 10,
          zeroResultCount,
          zeroResultRate: totalSearches > 0 ? Math.round((zeroResultCount / totalSearches) * 100) / 100 : 0,
          clickThroughRate: Math.round(ctr * 100) / 100,
          topQueries,
          period: `${input.days} days`,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
