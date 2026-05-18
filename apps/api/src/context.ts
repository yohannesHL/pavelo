import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { supabaseAdmin } from "./lib/supabase.js";
import { prisma } from "./lib/prisma.js";

/**
 * tRPC context — created for each request.
 * Extracts and validates Supabase JWT from the Authorization header.
 * Sets userId, userEmail, and userRole when a valid token is present.
 * Upserts the user row in Prisma so FK constraints are satisfied.
 */
export async function createContext({ req, res }: CreateFastifyContextOptions) {
  let userId: string | undefined;
  let userEmail: string | undefined;
  let userRole: string | undefined;

  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    if (token) {
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);

        if (!error && data.user) {
          userId = data.user.id;
          userEmail = data.user.email;
          userRole = data.user.user_metadata?.role || "buyer";

          // Ensure user row exists in Prisma DB (Supabase Auth is source of truth,
          // but Prisma FK constraints require a matching row in the users table).
          const validRoles = ["buyer", "seller", "agent"] as const;
          type ValidRole = (typeof validRoles)[number];
          const prismaRole: ValidRole = validRoles.includes(userRole as ValidRole)
            ? (userRole as ValidRole)
            : "buyer";

          await prisma.user.upsert({
            where: { id: userId },
            update: { email: userEmail ?? "", name: data.user.user_metadata?.name || userEmail || "" },
            create: {
              id: userId,
              email: userEmail ?? "",
              name: data.user.user_metadata?.name || userEmail || "User",
              role: prismaRole,
            },
          });
        }
      } catch {
        // Token validation failed — userId stays undefined.
        // protectedProcedure middleware will throw UNAUTHORIZED.
      }
    }
  }

  return {
    req,
    res,
    userId,
    userEmail,
    userRole,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
