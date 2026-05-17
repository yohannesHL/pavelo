import { FastifyRequest, FastifyReply } from "fastify";

/**
 * JWT validation middleware
 * Verifies Supabase JWT token from Authorization header
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Missing or invalid Authorization header",
    });
  }

  const token = authHeader.slice(7);

  if (!token) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Empty token",
    });
  }

  // TODO: Verify JWT with Supabase in Sprint 1 Phase 3
  // For now, just check token exists
  (request as any).userId = "placeholder";
}
