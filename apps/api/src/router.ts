import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./context.js";
import { prisma } from "./lib/prisma.js";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Middleware that requires authentication */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId as string } });
});

export const protectedProcedure = t.procedure.use(isAuthed);

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
});

export type AppRouter = typeof appRouter;
