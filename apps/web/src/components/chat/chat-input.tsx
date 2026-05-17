"use client";

/**
 * ChatInput — auto-resizing text area with send functionality
 *
 * Features:
 * - Auto-resize textarea
 * - Enter to send, Shift+Enter for newline
 * - Send button with disabled state
 * - Attachment placeholder button
 */

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { Send, Paperclip } from "lucide-react";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Message Xara...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue("");

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-[var(--border)] bg-white px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        {/* Attachment placeholder */}
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          title="Attach file (coming soon)"
          disabled
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Text area */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--color-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all disabled:opacity-50"
            style={{ maxHeight: "160px" }}
          />
        </div>

        {/* Send button */}
        <motion.button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all
            ${
              canSend
                ? "bg-[var(--color-accent)] text-white shadow-sm hover:bg-[var(--color-accent-light)] active:scale-95"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
            }
          `}
          whileTap={canSend ? { scale: 0.92 } : undefined}
          title="Send message"
        >
          <Send className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Helper text */}
      <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-[var(--muted-foreground)]">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
