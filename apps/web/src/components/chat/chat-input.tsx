"use client";

/**
 * ChatInput — auto-resizing text area with voice toggle orchestrator (S11-05)
 *
 * Features:
 * - Auto-resize textarea
 * - Enter to send, Shift+Enter for newline
 * - VoiceToggleButton between Paperclip and textarea
 * - When voice active: show InlineVoicePanel instead of textarea+Send
 * - Keyboard shortcut: Ctrl+Shift+V toggles voice
 */

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { Send, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceToggleButton } from "./voice-toggle-button";
import { InlineVoicePanel } from "./inline-voice-panel";
import type { VoiceConnectionState, AgentSpeakingState } from "@/hooks/use-voice-session";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  voiceActive?: boolean;
  onVoiceToggle?: () => void;
  voiceDisabled?: boolean;
  voiceConnectionState?: VoiceConnectionState;
  isMuted?: boolean;
  onToggleMute?: () => void;
  audioLevel?: number;
  agentAudioLevel?: number;
  agentState?: AgentSpeakingState;
  onEndVoice?: () => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Message Xara...",
  voiceActive = false,
  onVoiceToggle,
  voiceDisabled = false,
  voiceConnectionState = "idle",
  isMuted = false,
  onToggleMute,
  audioLevel = 0,
  agentAudioLevel = 0,
  agentState = "listening",
  onEndVoice,
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

  // Keyboard shortcut: Ctrl+Shift+V toggles voice
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "V" && onVoiceToggle && !voiceDisabled) {
        e.preventDefault();
        onVoiceToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onVoiceToggle, voiceDisabled]);

  const canSend = value.trim().length > 0 && !disabled;

  const handleSwitchToText = useCallback(() => {
    if (onEndVoice) onEndVoice();
  }, [onEndVoice]);

  return (
    <div className="border-t border-[var(--border)] bg-white px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <AnimatePresence mode="wait">
          {voiceActive ? (
            <motion.div
              key="voice-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <InlineVoicePanel
                connectionState={voiceConnectionState}
                isMuted={isMuted}
                onToggleMute={onToggleMute || (() => {})}
                onEndCall={onEndVoice || (() => {})}
                audioLevel={audioLevel}
                agentAudioLevel={agentAudioLevel}
                agentState={agentState}
                onSwitchToText={handleSwitchToText}
                visible={true}
              />
            </motion.div>
          ) : (
            <motion.div
              key="text-input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-end gap-2"
            >
              {/* Attachment placeholder */}
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                title="Attach file (coming soon)"
                disabled
              >
                <Paperclip className="h-5 w-5" />
              </button>

              {/* Voice toggle */}
              {onVoiceToggle && (
                <VoiceToggleButton
                  isActive={false}
                  onClick={onVoiceToggle}
                  disabled={voiceDisabled}
                />
              )}

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
                  role="textbox"
                  aria-label="Message Xara"
                  aria-multiline="true"
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--color-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all disabled:opacity-50"
                  style={{ maxHeight: "160px" }}
                />
              </div>

              {/* Send button */}
              <motion.button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                aria-label="Send message"
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Helper text */}
        <p className="mt-1.5 text-center text-[10px] text-[var(--muted-foreground)]">
          {voiceActive
            ? "Xara is listening..."
            : "Press Enter to send · Shift+Enter for new line · Ctrl+Shift+V for voice"}
        </p>
      </div>
    </div>
  );
}

