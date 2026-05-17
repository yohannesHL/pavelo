import { z } from "zod";

/**
 * VisualPayload — the protocol for agent-driven UI rendering.
 * When the AI agent wants to display visual content in the chat,
 * it sends a VisualPayload directive that the frontend renders.
 */

export const VisualPayloadType = z.enum([
  "property_card",
  "property_grid",
  "map_view",
  "price_chart",
  "comparison_table",
  "area_stats",
  "image_gallery",
  "mortgage_estimate",
]);
export type VisualPayloadType = z.infer<typeof VisualPayloadType>;

export const VisualPayloadSchema = z.object({
  type: VisualPayloadType,
  data: z.record(z.unknown()),
  title: z.string().optional(),
  description: z.string().optional(),
});
export type VisualPayload = z.infer<typeof VisualPayloadSchema>;

// --- Agent State (mirrors LangGraph state) ---
export const AgentStateSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  messages: z.array(z.unknown()),
  memoryContext: z.record(z.unknown()).optional(),
  activeSearchParams: z.record(z.unknown()).optional(),
  toolResults: z.array(z.unknown()).default([]),
  propertiesShown: z.array(z.string().uuid()).default([]),
  agentPersona: z.string().default("xara"),
  intent: z.string().optional(),
});
export type AgentState = z.infer<typeof AgentStateSchema>;
