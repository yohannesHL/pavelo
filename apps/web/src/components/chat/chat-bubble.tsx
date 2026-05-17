"use client";

/**
 * ChatBubble — individual message bubble in the chat stream
 *
 * - User messages: right-aligned, accent color
 * - Agent messages: left-aligned, white/card bg with avatar
 * - System messages: centered, muted
 * - Markdown rendering for agent messages
 * - Framer Motion entrance animation
 */

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import type { ChatMessage } from "@/stores/chat-store";

interface ChatBubbleProps {
  message: ChatMessage;
  isLatest?: boolean;
}

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
};

function XaraAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-sm font-bold shadow-sm">
      X
    </div>
  );
}

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export const ChatBubble = memo(function ChatBubble({
  message,
  isLatest,
}: ChatBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAgent = message.role === "assistant";

  if (isSystem) {
    return (
      <motion.div
        className="flex justify-center px-4 py-2"
        variants={messageVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-md rounded-lg bg-[var(--muted)] px-4 py-2 text-center text-xs text-[var(--muted-foreground)]">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex gap-3 px-4 py-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      variants={messageVariants}
      initial={isLatest ? "hidden" : false}
      animate="visible"
      layout
    >
      {/* Avatar */}
      {isAgent && <XaraAvatar />}

      {/* Bubble */}
      <div
        className={`
          relative max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
          ${
            isUser
              ? "bg-[var(--color-accent)] text-white rounded-br-md"
              : "bg-white border border-[var(--border)] text-[var(--foreground)] rounded-bl-md shadow-sm"
          }
          ${message.streaming ? "animate-pulse-subtle" : ""}
        `}
      >
        {isAgent ? (
          <div className="chat-markdown prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {message.streaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-[var(--color-primary)] animate-blink rounded-sm" />
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}

        {/* Timestamp */}
        <div
          className={`mt-1 text-[10px] ${
            isUser ? "text-white/60" : "text-[var(--muted-foreground)]"
          }`}
        >
          {formatTime(message.createdAt)}
        </div>
      </div>
    </motion.div>
  );
});
