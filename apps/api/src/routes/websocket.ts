/**
 * WebSocket Plugin for Fastify (S5-02)
 *
 * Provides authenticated WebSocket connections with:
 * - JWT validation on upgrade
 * - Room-based message routing (one room per conversation)
 * - Heartbeat/ping-pong disconnect detection
 * - Typed message protocol
 *
 * Message types:
 *   user_message     — User sends a chat message
 *   agent_response   — Agent text response (may be streamed token-by-token)
 *   agent_typing     — Agent is thinking/generating
 *   visual_payload   — Rich visual directive (property card, map, chart)
 *   error            — Error notification
 *   pong             — Heartbeat response
 */

import { FastifyInstance, FastifyRequest } from "fastify";
import { WebSocket, WebSocketServer } from "ws";
import { supabaseAdmin } from "../lib/supabase.js";
import { prisma } from "../lib/prisma.js";

// --- Types ---

export interface WSMessage {
  type:
    | "user_message"
    | "agent_response"
    | "agent_typing"
    | "visual_payload"
    | "error"
    | "ping"
    | "pong"
    | "join_room"
    | "leave_room"
    | "history_loaded";
  conversationId?: string;
  content?: string;
  payload?: Record<string, unknown>;
  messageId?: string;
  streaming?: boolean;
  done?: boolean;
}

interface AuthenticatedSocket extends WebSocket {
  userId: string;
  userEmail: string;
  userRole: string;
  conversationId: string | null;
  isAlive: boolean;
}

// --- Connection Registry ---

const rooms = new Map<string, Set<AuthenticatedSocket>>();

function joinRoom(socket: AuthenticatedSocket, conversationId: string) {
  socket.conversationId = conversationId;
  if (!rooms.has(conversationId)) {
    rooms.set(conversationId, new Set());
  }
  rooms.get(conversationId)!.add(socket);
}

function leaveRoom(socket: AuthenticatedSocket) {
  if (socket.conversationId && rooms.has(socket.conversationId)) {
    rooms.get(socket.conversationId)!.delete(socket);
    if (rooms.get(socket.conversationId)!.size === 0) {
      rooms.delete(socket.conversationId);
    }
  }
  socket.conversationId = null;
}

/** Send a message to all sockets in a room */
export function broadcastToRoom(conversationId: string, message: WSMessage) {
  const roomSockets = rooms.get(conversationId);
  if (!roomSockets) return;

  const data = JSON.stringify(message);
  for (const socket of roomSockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }
}

/** Send a message to a specific user's sockets in a room */
export function sendToUser(conversationId: string, userId: string, message: WSMessage) {
  const roomSockets = rooms.get(conversationId);
  if (!roomSockets) return;

  const data = JSON.stringify(message);
  for (const socket of roomSockets) {
    if (socket.userId === userId && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }
}

// --- Agent Service Communication ---

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

async function relayToAgent(
  userId: string,
  conversationId: string,
  content: string,
) {
  // Send typing indicator
  broadcastToRoom(conversationId, {
    type: "agent_typing",
    conversationId,
  });

  try {
    // Call agent service with SSE streaming
    const response = await fetch(`${AGENT_SERVICE_URL}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        conversation_id: conversationId,
        message: content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Agent service error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/event-stream")) {
      // SSE streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let visualPayloads: Record<string, unknown>[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              if (event.type === "token") {
                fullContent += event.content;
                broadcastToRoom(conversationId, {
                  type: "agent_response",
                  conversationId,
                  content: event.content,
                  streaming: true,
                  done: false,
                });
              } else if (event.type === "visual_payload") {
                visualPayloads.push(event.payload);
                broadcastToRoom(conversationId, {
                  type: "visual_payload",
                  conversationId,
                  payload: event.payload,
                });
              } else if (event.type === "done") {
                broadcastToRoom(conversationId, {
                  type: "agent_response",
                  conversationId,
                  content: "",
                  streaming: true,
                  done: true,
                });
              }
            } catch {
              // Skip malformed SSE data
            }
          }
        }
      }

      // Persist agent message
      if (fullContent) {
        await prisma.message.create({
          data: {
            conversationId,
            role: "assistant",
            content: fullContent,
            visualPayloads: visualPayloads.length > 0 ? visualPayloads : [],
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: {},  // Touch updatedAt
        });
      }
    } else {
      // Non-streaming JSON response
      const data = await response.json();

      const agentContent = data.response || data.content || "I'm not sure how to help with that.";
      const visualPayloads = data.visual_payloads || [];

      // Send complete response
      broadcastToRoom(conversationId, {
        type: "agent_response",
        conversationId,
        content: agentContent,
        streaming: false,
        done: true,
      });

      // Send visual payloads
      for (const vp of visualPayloads) {
        broadcastToRoom(conversationId, {
          type: "visual_payload",
          conversationId,
          payload: vp,
        });
      }

      // Persist agent message
      await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: agentContent,
          visualPayloads: visualPayloads.length > 0 ? visualPayloads : [],
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {},
      });
    }
  } catch (error: any) {
    console.error("Agent relay error:", error.message);
    broadcastToRoom(conversationId, {
      type: "error",
      conversationId,
      content: "Sorry, I'm having trouble connecting. Please try again.",
    });
  }
}

// --- WebSocket Plugin ---

export async function websocketPlugin(app: FastifyInstance) {
  // Create WebSocket server attached to the Fastify server
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade with JWT auth
  app.server.on("upgrade", async (request, socket, head) => {
    // Only handle /ws path
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/ws") return;

    // Extract token from query param or header
    const token =
      url.searchParams.get("token") ||
      request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !data.user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      // Upgrade with authenticated user info
      wss.handleUpgrade(request, socket, head, (ws) => {
        const authSocket = ws as AuthenticatedSocket;
        authSocket.userId = data.user.id;
        authSocket.userEmail = data.user.email || "";
        authSocket.userRole = data.user.user_metadata?.role || "buyer";
        authSocket.conversationId = null;
        authSocket.isAlive = true;

        wss.emit("connection", authSocket, request);
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  // --- Connection Handler ---
  wss.on("connection", (ws: AuthenticatedSocket) => {
    console.log(`WS connected: ${ws.userId}`);

    // Heartbeat
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          case "join_room":
            if (!message.conversationId) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  content: "conversationId is required to join a room",
                })
              );
              return;
            }

            // Verify user owns the conversation
            const conv = await prisma.conversation.findFirst({
              where: {
                id: message.conversationId,
                userId: ws.userId,
                deletedAt: null,
              },
            });

            if (!conv) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  content: "Conversation not found",
                })
              );
              return;
            }

            leaveRoom(ws);
            joinRoom(ws, message.conversationId);
            ws.send(
              JSON.stringify({
                type: "join_room",
                conversationId: message.conversationId,
              })
            );
            break;

          case "leave_room":
            leaveRoom(ws);
            break;

          case "user_message":
            if (!ws.conversationId) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  content: "Join a room first before sending messages",
                })
              );
              return;
            }

            if (!message.content?.trim()) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  content: "Message content cannot be empty",
                })
              );
              return;
            }

            // Persist user message
            const userMsg = await prisma.message.create({
              data: {
                conversationId: ws.conversationId,
                role: "user",
                content: message.content.trim(),
              },
            });

            // Auto-set title from first message
            const conversation = await prisma.conversation.findUnique({
              where: { id: ws.conversationId },
            });
            if (conversation && !conversation.title) {
              await prisma.conversation.update({
                where: { id: ws.conversationId },
                data: { title: message.content.trim().slice(0, 100) },
              });
            }

            // Echo back to confirm receipt
            broadcastToRoom(ws.conversationId, {
              type: "user_message",
              conversationId: ws.conversationId,
              content: message.content.trim(),
              messageId: userMsg.id,
            });

            // Relay to agent
            await relayToAgent(
              ws.userId,
              ws.conversationId,
              message.content.trim()
            );
            break;

          default:
            ws.send(
              JSON.stringify({
                type: "error",
                content: `Unknown message type: ${message.type}`,
              })
            );
        }
      } catch (error) {
        console.error("WS message error:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            content: "Invalid message format",
          })
        );
      }
    });

    ws.on("close", () => {
      leaveRoom(ws);
      console.log(`WS disconnected: ${ws.userId}`);
    });

    ws.on("error", (error) => {
      console.error(`WS error for ${ws.userId}:`, error.message);
      leaveRoom(ws);
    });
  });

  // --- Heartbeat Interval ---
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedSocket;
      if (!authWs.isAlive) {
        leaveRoom(authWs);
        return authWs.terminate();
      }
      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  // Expose wss on the app for testing
  (app as any).wss = wss;
}
