import { z } from "zod";

/**
 * VisualPayload — the protocol for agent-driven UI rendering (S5-07).
 * When the AI agent wants to display visual content in the chat,
 * it sends a VisualPayload directive that the frontend renders.
 */

export const VisualPayloadType = z.enum([
  "property_card",
  "property_carousel",
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

// --- WebSocket Message Types (S5-02) ---

export const WSMessageType = z.enum([
  "user_message",
  "agent_response",
  "agent_typing",
  "visual_payload",
  "error",
  "ping",
  "pong",
  "join_room",
  "leave_room",
  "history_loaded",
]);
export type WSMessageType = z.infer<typeof WSMessageType>;

export const WSMessageSchema = z.object({
  type: WSMessageType,
  conversationId: z.string().uuid().optional(),
  content: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  messageId: z.string().optional(),
  streaming: z.boolean().optional(),
  done: z.boolean().optional(),
});
export type WSMessage = z.infer<typeof WSMessageSchema>;

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
  visualPayloads: z.array(VisualPayloadSchema).default([]),
});
export type AgentState = z.infer<typeof AgentStateSchema>;
