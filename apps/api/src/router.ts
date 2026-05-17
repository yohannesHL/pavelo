import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),

  property: router({
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(50).default(20),
          cursor: z.string().uuid().optional(),
        })
      )
      .query(async ({ input }) => {
        // Placeholder - will connect to Prisma in Phase 2
        return { items: [], nextCursor: null, limit: input.limit };
      }),
  }),
});

export type AppRouter = typeof appRouter;
