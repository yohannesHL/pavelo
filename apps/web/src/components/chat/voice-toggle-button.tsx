"use client";

/**
 * VoiceToggleButton — Mic toggle for inline voice mode (S11-01)
 *
 * 44x44px min touch target, gold pulse when active.
 * Mic icon when inactive, MicOff when active (indicating "tap to stop").
 */

import { Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";

interface VoiceToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function VoiceToggleButton({
  isActive,
  onClick,
  disabled = false,
}: VoiceToggleButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Toggle voice mode"
      aria-pressed={isActive}
      className={`
        relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 focus:ring-offset-1
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          isActive
            ? "bg-[#F4A261] text-[#0D1B2A] shadow-md voice-toggle-active"
            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        }
      `}
      whileTap={!disabled ? { scale: 0.92 } : undefined}
      title={isActive ? "Stop voice mode" : "Start voice mode"}
    >
      {isActive ? (
        <MicOff className="h-5 w-5" />
      ) : (
        <Mic className="h-5 w-5" />
      )}

      {/* Pulse glow ring when active */}
      {isActive && (
        <span
          className="absolute inset-0 rounded-xl animate-voice-pulse-glow motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
    </motion.button>
  );
}
