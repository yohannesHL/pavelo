"use client";

/**
 * ChatMessageList — scrollable message stream with auto-scroll
 *
 * Features:
 * - Auto-scroll to bottom on new messages
 * - Typing indicator
 * - AnimatePresence for smooth transitions
 * - Empty state when no messages
 */

import { useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { ChatBubble } from "./chat-bubble";
import { TypingIndicator } from "./typing-indicator";
import { VisualPayloadRenderer } from "./visual-payload-renderer";
import type { ChatMessage } from "@/stores/chat-store";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isAgentTyping: boolean;
}

export function ChatMessageList({
  messages,
  isAgentTyping,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // Auto-scroll on new messages or typing
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isAgentTyping, scrollToBottom]);

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  if (messages.length === 0 && !isAgentTyping) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        {/* Xara intro */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-2xl font-bold shadow-lg">
          X
        </div>
        <h2 className="text-xl font-semibold text-[var(--foreground)]">
          Chat with Xara
        </h2>
        <p className="mt-2 max-w-md text-center text-sm text-[var(--muted-foreground)]">
          Your AI estate agent that listens, remembers, and delivers. Ask about
          properties, neighbourhoods, market trends, or anything property-related.
        </p>

        {/* Suggestions */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {[
            "Find 3-bed houses in London under £500k",
            "What are schools like in Bristol?",
            "Compare detached vs semi-detached",
            "Help me value my property",
          ].map((suggestion) => (
            <button
              key={suggestion}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs text-[var(--muted-foreground)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
              onClick={() => {
                // Trigger via custom event
                window.dispatchEvent(
                  new CustomEvent("chat-suggestion", {
                    detail: suggestion,
                  })
                );
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scroll-smooth px-2 py-4"
    >
      <div className="mx-auto max-w-3xl space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <div key={msg.id}>
              <ChatBubble
                message={msg}
                isLatest={index === messages.length - 1}
              />
              {/* Render visual payloads inline below the message */}
              {msg.visualPayloads && msg.visualPayloads.length > 0 && (
                <div className="ml-11 mr-4 mt-2 space-y-2">
                  {msg.visualPayloads.map((vp, vpIndex) => (
                    <VisualPayloadRenderer
                      key={`${msg.id}-vp-${vpIndex}`}
                      payload={vp}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {isAgentTyping && <TypingIndicator />}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
