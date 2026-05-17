/**
 * Webhook Delivery Service (S9-04)
 *
 * Dispatches webhook events with retry logic (3 attempts, exponential backoff).
 * Zapier/Make compatible JSON payloads.
 */

import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Sign a payload with HMAC-SHA256 for webhook verification.
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Dispatch a webhook event to all active webhook configs for an agency.
 */
export async function dispatchWebhookEvent(
  agencyId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const webhooks = await prisma.webhookConfig.findMany({
    where: {
      agencyId,
      active: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadStr = JSON.stringify(payload);

  for (const webhook of webhooks) {
    // Create delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: payload as any,
      },
    });

    // Fire and forget — retry in background
    deliverWithRetry(delivery.id, webhook.url, webhook.secret, payloadStr).catch(
      (err) => console.error(`[Webhook] Failed delivery ${delivery.id}:`, err)
    );
  }
}

/**
 * Deliver a webhook with exponential backoff retry.
 */
async function deliverWithRetry(
  deliveryId: string,
  url: string,
  secret: string,
  payloadStr: string
): Promise<void> {
  const signature = signPayload(payloadStr, secret);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pavelo-Signature": signature,
          "X-Pavelo-Event": JSON.parse(payloadStr).event,
          "User-Agent": "Pavelo-Webhooks/1.0",
        },
        body: payloadStr,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      const responseText = await response.text().catch(() => "");

      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          statusCode: response.status,
          response: responseText.slice(0, 1000),
          success: response.ok,
          attempts: attempt,
          lastAttempt: new Date(),
        },
      });

      if (response.ok) return; // Success!

      // Non-retryable status codes
      if (response.status >= 400 && response.status < 500) return;
    } catch (error: any) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          attempts: attempt,
          lastAttempt: new Date(),
          response: error.message?.slice(0, 1000) || "Unknown error",
        },
      });
    }

    // Exponential backoff before next attempt
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, BASE_DELAY_MS * Math.pow(2, attempt - 1)));
    }
  }
}
