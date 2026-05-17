"use client";

/**
 * VoiceControls — Session control buttons (S6-05)
 *
 * Controls:
 * - Mute/unmute toggle (red accent when muted)
 * - End call button
 * - Volume indicator
 * - Duration display
 *
 * Design: large touch targets (48px min), high contrast
 * Responsive: works as bottom bar on mobile
 */

import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import type { VoiceConnectionState } from "@/hooks/use-voice-session";

interface VoiceControlsProps {
  connectionState: VoiceConnectionState;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  audioLevel: number;
  durationSecs: number;
  className?: string;
}

function formatDuration(secs: number): string {
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function VoiceControls({
  connectionState,
  isMuted,
  onToggleMute,
  onEndCall,
  audioLevel,
  durationSecs,
  className = "",
}: VoiceControlsProps) {
  const isConnected = connectionState === "connected";
  const isConnecting =
    connectionState === "connecting" || connectionState === "requesting";

  return (
    <div
      className={`flex items-center justify-center gap-6 ${className}`}
      role="toolbar"
      aria-label="Voice session controls"
    >
      {/* Duration */}
      <div className="flex items-center gap-2 min-w-[72px]">
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected
              ? "bg-[#10b981] animate-pulse"
              : isConnecting
                ? "bg-[#f59e0b] animate-pulse"
                : "bg-[#737373]"
          }`}
          aria-label={`Connection: ${connectionState}`}
        />
        <span className="text-white/70 text-sm font-mono tabular-nums">
          {formatDuration(durationSecs)}
        </span>
      </div>

      {/* Volume indicator */}
      <div className="flex items-center gap-1.5">
        <Volume2 className="h-4 w-4 text-white/40" />
        <div className="flex gap-0.5 items-end h-4">
          {[0.2, 0.4, 0.6, 0.8].map((threshold, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-100 ${
                audioLevel >= threshold
                  ? "bg-[#F4A261]"
                  : "bg-white/20"
              }`}
              style={{ height: `${(i + 1) * 4}px` }}
            />
          ))}
        </div>
      </div>

      {/* Mute toggle */}
      <button
        onClick={onToggleMute}
        disabled={!isConnected}
        className={`
          flex items-center justify-center
          h-14 w-14 rounded-full
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent
          disabled:opacity-40 disabled:cursor-not-allowed
          ${
            isMuted
              ? "bg-[#ef4444] hover:bg-[#dc2626] shadow-lg shadow-red-500/25"
              : "bg-white/10 hover:bg-white/20 border border-white/20"
          }
        `}
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <MicOff className="h-6 w-6 text-white" />
        ) : (
          <Mic className="h-6 w-6 text-white" />
        )}
      </button>

      {/* End call */}
      <button
        onClick={onEndCall}
        disabled={!isConnected && !isConnecting}
        className={`
          flex items-center justify-center
          h-14 w-14 rounded-full
          bg-[#ef4444] hover:bg-[#dc2626]
          transition-all duration-200
          shadow-lg shadow-red-500/25
          focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:ring-offset-2 focus:ring-offset-transparent
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
        aria-label="End voice session"
        title="End call"
      >
        <PhoneOff className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}
