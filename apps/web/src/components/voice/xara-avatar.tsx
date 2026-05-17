"use client";

/**
 * XaraAvatar — Animated agent avatar for voice mode (S6-05)
 *
 * Features:
 * - Pulsing glow when TTS is active (speaking state)
 * - Soft idle animation when listening
 * - Thinking state animation
 * - Gold accent on active elements
 * - Respects prefers-reduced-motion
 */

import type { AgentSpeakingState } from "@/hooks/use-voice-session";

interface XaraAvatarProps {
  state: AgentSpeakingState;
  audioLevel?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
} as const;

const RING_SIZES = {
  sm: "h-20 w-20",
  md: "h-28 w-28",
  lg: "h-36 w-36",
} as const;

const OUTER_SIZES = {
  sm: "h-24 w-24",
  md: "h-32 w-32",
  lg: "h-40 w-40",
} as const;

export function XaraAvatar({
  state,
  audioLevel = 0,
  size = "lg",
  className = "",
}: XaraAvatarProps) {
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";
  const isListening = state === "listening";

  // Scale the outer ring based on audio level when speaking
  const speakingScale = isSpeaking ? 1 + audioLevel * 0.15 : 1;

  return (
    <div
      className={`relative flex items-center justify-center ${OUTER_SIZES[size]} ${className}`}
      role="img"
      aria-label={`Xara is ${state}`}
    >
      {/* Outer glow ring */}
      <div
        className={`
          absolute inset-0 rounded-full
          transition-all duration-300
          motion-reduce:transition-none
          ${
            isSpeaking
              ? "bg-[#F4A261]/20 shadow-[0_0_40px_rgba(244,162,97,0.3)]"
              : isThinking
                ? "bg-[#2E86AB]/15 shadow-[0_0_30px_rgba(46,134,171,0.2)]"
                : "bg-white/5"
          }
        `}
        style={{
          transform: `scale(${speakingScale})`,
          transition: "transform 150ms ease-out, background-color 300ms, box-shadow 300ms",
        }}
      />

      {/* Inner ring — pulsing border */}
      <div
        className={`
          absolute ${RING_SIZES[size]} rounded-full
          border-2 transition-all duration-300
          motion-reduce:animate-none
          ${
            isSpeaking
              ? "border-[#F4A261]/60 animate-[voice-pulse_1.5s_ease-in-out_infinite]"
              : isThinking
                ? "border-[#2E86AB]/40 animate-[voice-think_2s_ease-in-out_infinite]"
                : "border-white/10"
          }
        `}
      />

      {/* Avatar circle */}
      <div
        className={`
          relative ${SIZES[size]} rounded-full
          flex items-center justify-center
          bg-gradient-to-br from-[#1B3A6B] to-[#0D1B2A]
          border-2 transition-all duration-300
          ${
            isSpeaking
              ? "border-[#F4A261] shadow-lg shadow-[#F4A261]/20"
              : isThinking
                ? "border-[#2E86AB] shadow-lg shadow-[#2E86AB]/20"
                : "border-white/20"
          }
        `}
      >
        {/* Xara "X" monogram */}
        <span
          className={`
            font-bold select-none transition-colors duration-300
            ${size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-lg"}
            ${
              isSpeaking
                ? "text-[#F4A261]"
                : isThinking
                  ? "text-[#2E86AB]"
                  : "text-white/60"
            }
          `}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          X
        </span>

        {/* Thinking dots */}
        {isThinking && (
          <div className="absolute -bottom-1 flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-[#2E86AB] motion-reduce:animate-none"
                style={{
                  animation: `voice-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* State label */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
        <span
          className={`
            text-xs font-medium uppercase tracking-wider
            transition-colors duration-300
            ${
              isSpeaking
                ? "text-[#F4A261]"
                : isThinking
                  ? "text-[#2E86AB]"
                  : "text-white/40"
            }
          `}
        >
          {state}
        </span>
      </div>
    </div>
  );
}
