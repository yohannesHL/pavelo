"use client";

/**
 * ConnectionStatus — Voice connection state indicator (S6-05)
 *
 * Shows connection quality and state with appropriate messaging.
 * Smooth 300ms crossfade between states.
 */

import { Wifi, WifiOff, Loader2, AlertCircle } from "lucide-react";
import type { VoiceConnectionState } from "@/hooks/use-voice-session";

interface ConnectionStatusProps {
  state: VoiceConnectionState;
  error?: string | null;
  className?: string;
}

const STATE_CONFIG: Record<
  VoiceConnectionState,
  { icon: typeof Wifi; label: string; color: string; bgColor: string }
> = {
  idle: {
    icon: Wifi,
    label: "Ready to connect",
    color: "text-white/50",
    bgColor: "bg-white/5",
  },
  requesting: {
    icon: Loader2,
    label: "Setting up session...",
    color: "text-[#f59e0b]",
    bgColor: "bg-[#f59e0b]/10",
  },
  connecting: {
    icon: Loader2,
    label: "Connecting...",
    color: "text-[#f59e0b]",
    bgColor: "bg-[#f59e0b]/10",
  },
  connected: {
    icon: Wifi,
    label: "Connected",
    color: "text-[#10b981]",
    bgColor: "bg-[#10b981]/10",
  },
  disconnecting: {
    icon: Loader2,
    label: "Disconnecting...",
    color: "text-white/50",
    bgColor: "bg-white/5",
  },
  disconnected: {
    icon: WifiOff,
    label: "Disconnected",
    color: "text-white/40",
    bgColor: "bg-white/5",
  },
  error: {
    icon: AlertCircle,
    label: "Connection error",
    color: "text-[#ef4444]",
    bgColor: "bg-[#ef4444]/10",
  },
};

export function ConnectionStatus({
  state,
  error,
  className = "",
}: ConnectionStatusProps) {
  const config = STATE_CONFIG[state];
  const Icon = config.icon;
  const isAnimating = state === "connecting" || state === "requesting" || state === "disconnecting";

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        transition-all duration-300
        ${config.bgColor}
        ${className}
      `}
      role="status"
      aria-label={error || config.label}
    >
      <Icon
        className={`h-3.5 w-3.5 ${config.color} ${
          isAnimating ? "animate-spin" : ""
        }`}
      />
      <span className={`text-xs font-medium ${config.color}`}>
        {error ? error.slice(0, 50) : config.label}
      </span>
    </div>
  );
}
