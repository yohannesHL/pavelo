"use client";

/**
 * /chat — Chat landing page
 *
 * Shows the empty state with Xara intro and suggestion chips.
 * Handles ?voice=true param to auto-start voice session.
 */

import { Suspense, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    messages,
    isAgentTyping,
    connectionStatus,
    conversationId,
    sendMessage,
    createConversation,
    joinRoom,
    clearMessages,
    setVoiceActive,
  } = useChatStore();

  // Handle ?voice=true query param
  useEffect(() => {
    const voiceParam = searchParams.get("voice");
    if (voiceParam === "true") {
      (async () => {
        const id = await createConversation();
        if (id) {
          joinRoom(id);
          setVoiceActive(true);
          router.replace(`/chat/${id}`);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for suggestion chip clicks
  useEffect(() => {
    const handler = async (e: Event) => {
      const suggestion = (e as CustomEvent).detail;
      if (suggestion) {
        // Create new conversation and send suggestion
        const id = await createConversation();
        if (id) {
          joinRoom(id);
          router.push(`/chat/${id}`);
          // Small delay to let WS join complete
          setTimeout(() => {
            useChatStore.getState().sendMessage(suggestion);
          }, 300);
        }
      }
    };

    window.addEventListener("chat-suggestion", handler);
    return () => window.removeEventListener("chat-suggestion", handler);
  }, [createConversation, joinRoom, router]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!conversationId) {
        // Create a new conversation first
        const id = await createConversation();
        if (id) {
          joinRoom(id);
          router.push(`/chat/${id}`);
          setTimeout(() => {
            useChatStore.getState().sendMessage(content);
          }, 300);
        }
      } else {
        sendMessage(content);
      }
    },
    [conversationId, createConversation, joinRoom, router, sendMessage]
  );

  const handleVoiceToggle = useCallback(async () => {
    // Create conversation and navigate — voice will auto-connect on conversation page
    const id = await createConversation();
    if (id) {
      joinRoom(id);
      setVoiceActive(true);
      router.push(`/chat/${id}`);
    }
  }, [createConversation, joinRoom, setVoiceActive, router]);

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
        onVoiceToggle={handleVoiceToggle}
        voiceDisabled={connectionStatus !== "connected"}
      />
    </>
  );
}
