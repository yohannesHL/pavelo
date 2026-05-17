import { FastifyRequest, FastifyReply } from "fastify";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    // Attach user to request
    (request as any).userId = data.user.id;
    (request as any).userEmail = data.user.email;
    (request as any).userRole = data.user.user_metadata?.role || "buyer";
  } catch {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Token verification failed",
    });
  }
}
