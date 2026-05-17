import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import multipart from "@fastify/multipart";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth.js";

/** Allowed image MIME types */
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/** Max file size: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Image upload routes — multipart upload endpoint.
 * In production, images would go to Cloudflare R2/Images.
 * For now, we store a placeholder URL and validate the upload.
 */
export async function imageRoutes(app: FastifyInstance) {
  // Register multipart support
  await app.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 20, // max 20 images per request
    },
  });

  /**
   * POST /upload/images/:propertyId
   * Upload one or more images for a property
   */
  app.post(
    "/upload/images/:propertyId",
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: { propertyId: string } }>,
      reply: FastifyReply
    ) => {
      const { propertyId } = request.params;
      const userId = (request as AuthenticatedRequest).userId;

      // Verify property exists and user owns it
      const property = await prisma.property.findFirst({
        where: { id: propertyId, deletedAt: null },
      });

      if (!property) {
        return reply.status(404).send({ error: "Property not found" });
      }

      if (property.ownerId !== userId) {
        return reply
          .status(403)
          .send({ error: "You can only upload images to your own properties" });
      }

      const parts = request.parts();
      const uploadedUrls: string[] = [];
      const errors: string[] = [];

      for await (const part of parts) {
        if (part.type !== "file") continue;

        // Validate file type
        if (!ALLOWED_TYPES.has(part.mimetype)) {
          errors.push(
            `${part.filename}: Invalid type ${part.mimetype}. Allowed: JPEG, PNG, WebP, AVIF`
          );
          // Consume the stream to prevent hanging
          await part.toBuffer();
          continue;
        }

        // Read file to validate size
        const buffer = await part.toBuffer();
        if (buffer.length > MAX_FILE_SIZE) {
          errors.push(
            `${part.filename}: File too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Max 10MB.`
          );
          continue;
        }

        // In production: upload to Cloudflare R2/Images
        // For now: generate a placeholder URL
        const imageId = randomUUID();
        const ext = part.filename?.split(".").pop() || "jpg";
        const url = `/api/images/${propertyId}/${imageId}.${ext}`;

        uploadedUrls.push(url);
      }

      // Update property with new image URLs
      if (uploadedUrls.length > 0) {
        await prisma.property.update({
          where: { id: propertyId },
          data: {
            images: [...property.images, ...uploadedUrls],
          },
        });
      }

      return reply.send({
        uploaded: uploadedUrls.length,
        urls: uploadedUrls,
        errors: errors.length > 0 ? errors : undefined,
        total: property.images.length + uploadedUrls.length,
      });
    }
  );
}
