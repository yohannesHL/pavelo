import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

/**
 * tRPC context — created for each request.
 * Contains user info from auth middleware when available.
 */
export function createContext({ req, res }: CreateFastifyContextOptions) {
  const userId = (req as any).userId as string | undefined;
  const userEmail = (req as any).userEmail as string | undefined;
  const userRole = (req as any).userRole as string | undefined;

  return {
    req,
    res,
    userId,
    userEmail,
    userRole,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
