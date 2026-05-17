import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { supabaseAdmin } from "./lib/supabase.js";

/**
 * tRPC context — created for each request.
 * Extracts and validates Supabase JWT from the Authorization header.
 * Sets userId, userEmail, and userRole when a valid token is present.
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
