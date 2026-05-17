/**
 * tRPC Router Helpers — shared router/procedure exports
 *
 * Extracted from router.ts so route modules can import
 * router and protectedProcedure without circular deps.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

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
