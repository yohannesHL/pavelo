"use client";

/**
 * Chat Store — WebSocket connection + message state management
 *
 * Manages:
 * - WebSocket lifecycle (connect, disconnect, reconnect)
 * - Message send/receive
 * - Typing indicators
 * - Streaming response assembly
 * - Conversation state
 */

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

// --- Types ---

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  visualPayloads?: VisualPayload[];
  createdAt: string;
  streaming?: boolean;
  source?: "text" | "voice";
}

export interface VisualPayload {
  type: string;
  data: Record<string, unknown>;
  title?: string;
  description?: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  firstMessage: { content: string; role: string; createdAt: string } | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface WSMessage {
  type: string;
  conversationId?: string;
  content?: string;
  payload?: Record<string, unknown>;
  messageId?: string;
  streaming?: boolean;
  done?: boolean;
}

interface ChatState {
  // Connection
  ws: WebSocket | null;
  connectionStatus: ConnectionStatus;

  // Current conversation
  conversationId: string | null;
  messages: ChatMessage[];
  isAgentTyping: boolean;
  streamingContent: string;

  // Voice integration
  voiceActive: boolean;
  interimTranscript: string | null;

  // Conversation list
  conversations: ConversationSummary[];
  conversationsLoading: boolean;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  joinRoom: (conversationId: string) => void;
  sendMessage: (content: string) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  createConversation: () => Promise<string | null>;
  deleteConversation: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  searchConversations: (query: string) => Promise<void>;
  setConversationId: (id: string | null) => void;
  clearMessages: () => void;

  // Voice actions
  setVoiceActive: (active: boolean) => void;
  addVoiceTranscript: (entry: { id: string; text: string; speaker: "user" | "agent" }) => void;
  setInterimTranscript: (text: string | null) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000") + "/ws";

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export const useChatStore = create<ChatState>((set, get) => {
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;

  function cleanup() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  }

  return {
    ws: null,
    connectionStatus: "disconnected",
    conversationId: null,
    messages: [],
    isAgentTyping: false,
    streamingContent: "",
    voiceActive: false,
    interimTranscript: null,
    conversations: [],
    conversationsLoading: false,

    connect: async () => {
      const state = get();
      if (
        state.connectionStatus === "connecting" ||
        state.connectionStatus === "connected"
      )
        return;

      set({ connectionStatus: "connecting" });

      const token = await getAuthToken();
      if (!token) {
        set({ connectionStatus: "error" });
        return;
      }

      try {
        // TODO (#27): Migrate to auth-first-message protocol instead of query param.
        // See server-side comment in websocket.ts for details.
        const ws = new WebSocket(`${WS_URL}?token=${token}`);

        ws.onopen = () => {
          set({ ws, connectionStatus: "connected" });

          // Start ping interval
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 25000);

          // Re-join room if we had one
          const currentConvId = get().conversationId;
          if (currentConvId) {
            ws.send(
              JSON.stringify({
                type: "join_room",
                conversationId: currentConvId,
              })
            );
          }
        };

        ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            const state = get();

            switch (message.type) {
              case "user_message":
                // Message confirmed by server — already in state from optimistic add
                break;

              case "agent_typing":
                set({ isAgentTyping: true });
                break;

              case "agent_response":
                if (message.streaming && !message.done) {
                  // Streaming token — append to streaming content
                  const currentStreaming = get().streamingContent;
                  const newContent = currentStreaming + (message.content || "");
                  set({
                    streamingContent: newContent,
                    isAgentTyping: false,
                  });

                  // Update or create the streaming message
                  const msgs = get().messages;
                  const lastMsg = msgs[msgs.length - 1];
                  if (lastMsg?.streaming) {
                    set({
                      messages: msgs.map((m, i) =>
                        i === msgs.length - 1
                          ? { ...m, content: newContent }
                          : m
                      ),
                    });
                  } else {
                    set({
                      messages: [
                        ...msgs,
                        {
                          id: `streaming-${Date.now()}`,
                          role: "assistant",
                          content: newContent,
                          createdAt: new Date().toISOString(),
                          streaming: true,
                        },
                      ],
                    });
                  }
                } else if (message.done || !message.streaming) {
                  // Complete response
                  const msgs = get().messages;
                  const streamingContent = get().streamingContent;
                  const finalContent =
                    message.content || streamingContent || "";

                  // Replace streaming message with final, or add new
                  const lastMsg = msgs[msgs.length - 1];
                  if (lastMsg?.streaming) {
                    set({
                      messages: msgs.map((m, i) =>
                        i === msgs.length - 1
                          ? {
                              ...m,
                              id: message.messageId || m.id,
                              content: finalContent || m.content,
                              streaming: false,
                            }
                          : m
                      ),
                      streamingContent: "",
                      isAgentTyping: false,
                    });
                  } else if (finalContent) {
                    set({
                      messages: [
                        ...msgs,
                        {
                          id:
                            message.messageId ||
                            `agent-${Date.now()}`,
                          role: "assistant",
                          content: finalContent,
                          createdAt: new Date().toISOString(),
                        },
                      ],
                      streamingContent: "",
                      isAgentTyping: false,
                    });
                  } else {
                    set({
                      streamingContent: "",
                      isAgentTyping: false,
                    });
                  }
                }
                break;

              case "visual_payload":
                if (message.payload) {
                  // Attach visual payload to the last assistant message
                  const msgs = get().messages;
                  const lastAssistant = [...msgs]
                    .reverse()
                    .find((m) => m.role === "assistant");

                  if (lastAssistant) {
                    set({
                      messages: msgs.map((m) =>
                        m.id === lastAssistant.id
                          ? {
                              ...m,
                              visualPayloads: [
                                ...(m.visualPayloads || []),
                                message.payload as unknown as VisualPayload,
                              ],
                            }
                          : m
                      ),
                    });
                  }
                }
                break;

              case "error":
                set({ isAgentTyping: false });
                // Add error as system message
                set((s) => ({
                  messages: [
                    ...s.messages,
                    {
                      id: `error-${Date.now()}`,
                      role: "system" as const,
                      content:
                        message.content || "An error occurred",
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }));
                break;

              case "pong":
                break;

              case "join_room":
                break;
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          cleanup();
          set({ ws: null, connectionStatus: "disconnected" });

          // Auto-reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            get().connect();
          }, 3000);
        };

        ws.onerror = () => {
          set({ connectionStatus: "error" });
        };
      } catch {
        set({ connectionStatus: "error" });
      }
    },

    disconnect: () => {
      cleanup();
      const { ws } = get();
      if (ws) {
        ws.close();
      }
      set({
        ws: null,
        connectionStatus: "disconnected",
        conversationId: null,
      });
    },

    joinRoom: (conversationId: string) => {
      const { ws, connectionStatus } = get();
      set({ conversationId });

      if (ws && connectionStatus === "connected") {
        ws.send(
          JSON.stringify({ type: "join_room", conversationId })
        );
      }
    },

    sendMessage: (content: string) => {
      const { ws, connectionStatus, conversationId, messages } = get();

      if (!ws || connectionStatus !== "connected" || !conversationId) {
        return;
      }

      // Optimistic add
      const optimisticMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      set({ messages: [...messages, optimisticMsg] });

      ws.send(
        JSON.stringify({
          type: "user_message",
          conversationId,
          content,
        })
      );
    },

    loadMessages: async (conversationId: string) => {
      try {
        const res = await fetchWithAuth(
          `/trpc/conversation.get?input=${encodeURIComponent(
            JSON.stringify({ id: conversationId })
          )}`
        );
        const data = await res.json();
        const result = data?.result?.data;

        if (result?.messages) {
          set({
            messages: result.messages.map((m: { id: string; role: string; content: string; visualPayloads?: unknown[]; createdAt: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              visualPayloads: m.visualPayloads || [],
              createdAt: m.createdAt,
            })),
          });
        }
      } catch (error: unknown) {
        console.error("Failed to load messages:", error);
      }
    },

    createConversation: async () => {
      try {
        const res = await fetchWithAuth("/trpc/conversation.create", {
          method: "POST",
          body: JSON.stringify({}),
        });
        const data = await res.json();
        const result = data?.result?.data;

        if (result?.id) {
          set((s) => ({
            conversationId: result.id,
            messages: [],
            conversations: [
              {
                id: result.id,
                title: null,
                firstMessage: null,
                messageCount: 0,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
              },
              ...s.conversations,
            ],
          }));
          return result.id;
        }
        return null;
      } catch (error: unknown) {
        console.error("Failed to create conversation:", error);
        return null;
      }
    },

    deleteConversation: async (id: string) => {
      try {
        await fetchWithAuth("/trpc/conversation.delete", {
          method: "POST",
          body: JSON.stringify({ id }),
        });

        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          ...(s.conversationId === id
            ? { conversationId: null, messages: [] }
            : {}),
        }));
      } catch (error: unknown) {
        console.error("Failed to delete conversation:", error);
      }
    },

    loadConversations: async () => {
      set({ conversationsLoading: true });
      try {
        const res = await fetchWithAuth(
          `/trpc/conversation.list?input=${encodeURIComponent(
            JSON.stringify({ limit: 50 })
          )}`
        );
        const data = await res.json();
        const result = data?.result?.data;

        if (result?.items) {
          set({ conversations: result.items });
        }
      } catch (error: unknown) {
        console.error("Failed to load conversations:", error);
      } finally {
        set({ conversationsLoading: false });
      }
    },

    searchConversations: async (query: string) => {
      try {
        const res = await fetchWithAuth(
          `/trpc/conversation.search?input=${encodeURIComponent(
            JSON.stringify({ query })
          )}`
        );
        const data = await res.json();
        const result = data?.result?.data;

        if (result) {
          set({ conversations: result });
        }
      } catch (error: unknown) {
        console.error("Failed to search conversations:", error);
      }
    },

    setConversationId: (id: string | null) => {
      set({ conversationId: id });
    },

    clearMessages: () => {
      set({ messages: [], streamingContent: "", isAgentTyping: false, interimTranscript: null, voiceActive: false });
    },

    setVoiceActive: (active: boolean) => {
      set({ voiceActive: active });
    },

    addVoiceTranscript: (entry: { id: string; text: string; speaker: "user" | "agent" }) => {
      const { messages } = get();
      // Deduplicate by id
      if (messages.some((m) => m.id === entry.id)) return;

      const newMessage: ChatMessage = {
        id: entry.id,
        role: entry.speaker === "user" ? "user" : "assistant",
        content: entry.text,
        createdAt: new Date().toISOString(),
        source: "voice",
      };
      set({ messages: [...messages, newMessage] });
    },

    setInterimTranscript: (text: string | null) => {
      set({ interimTranscript: text });
    },
  };
});
