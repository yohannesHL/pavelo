"use client";

/**
 * /chat/[conversationId] — Active conversation page
 *
 * Loads conversation history and connects to WebSocket room.
 */

import { useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  const {
    messages,
    isAgentTyping,
    connectionStatus,
    conversationId: currentConvId,
    sendMessage,
    joinRoom,
    loadMessages,
    clearMessages,
  } = useChatStore();

  // Load conversation and join room
  useEffect(() => {
    if (conversationId && conversationId !== currentConvId) {
      clearMessages();
      loadMessages(conversationId);
      joinRoom(conversationId);
    }
  }, [conversationId, currentConvId, clearMessages, loadMessages, joinRoom]);

  // Listen for suggestion clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const suggestion = (e as CustomEvent).detail;
      if (suggestion) {
        sendMessage(suggestion);
      }
    };

    window.addEventListener("chat-suggestion", handler);
    return () => window.removeEventListener("chat-suggestion", handler);
  }, [sendMessage]);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content);
    },
    [sendMessage]
  );

  return (
    <>
      {/* Connection status bar */}
      {connectionStatus === "connecting" && (
        <div className="flex items-center justify-center gap-2 bg-[var(--color-gold)]/10 px-4 py-1.5 text-xs text-[var(--color-gold)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-gold)]" />
          Connecting to Xara...
        </div>
      )}
      {connectionStatus === "error" && (
        <div className="flex items-center justify-center gap-2 bg-[var(--color-error)]/10 px-4 py-1.5 text-xs text-[var(--color-error)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-error)]" />
          Connection lost — retrying...
        </div>
      )}

      {/* Messages */}
      <ChatMessageList messages={messages} isAgentTyping={isAgentTyping} />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={connectionStatus !== "connected"}
      />
    </>
  );
}
