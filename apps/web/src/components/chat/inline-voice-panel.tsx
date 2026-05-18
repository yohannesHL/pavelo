"use client";

/**
 * InlineVoicePanel — Compact voice session UI embedded in ChatInput (S11-02)
 *
 * Shows avatar, waveform, mute/end controls, and "switch to text" link.
 * Appears via AnimatePresence slide-up when voice is active.
 */

import { motion, AnimatePresence } from "framer-motion";
import { MicOff, Mic, PhoneOff } from "lucide-react";
import { XaraAvatar } from "@/components/voice";
import { VoiceWaveform } from "@/components/voice";
import type { VoiceConnectionState, AgentSpeakingState } from "@/hooks/use-voice-session";

interface InlineVoicePanelProps {
  connectionState: VoiceConnectionState;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  audioLevel: number;
  agentAudioLevel: number;
  agentState: AgentSpeakingState;
  onSwitchToText: () => void;
  visible: boolean;
}

export function InlineVoicePanel({
  connectionState,
  isMuted,
  onToggleMute,
  onEndCall,
  audioLevel,
  agentAudioLevel,
  agentState,
  onSwitchToText,
  visible,
}: InlineVoicePanelProps) {
  const isConnecting =
    connectionState === "connecting" || connectionState === "requesting";
  const isConnected = connectionState === "connected";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative overflow-hidden rounded-xl border-t-2 border-[#F4A261] bg-gradient-to-b from-[#0D1B2A] to-[#132B4D]"
          style={{ height: "120px" }}
        >
          <div className="flex h-full items-center gap-4 px-4">
            {/* Avatar */}
            <div className="shrink-0">
              <XaraAvatar
                state={isConnecting ? "thinking" : agentState}
                audioLevel={agentAudioLevel}
                size="sm"
              />
            </div>

            {/* Waveform + status */}
            <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
              {isConnecting ? (
                <p className="text-white/60 text-sm animate-pulse">
                  Connecting...
                </p>
              ) : (
                <VoiceWaveform
                  audioLevel={agentState === "speaking" ? agentAudioLevel : audioLevel}
                  isActive={isConnected}
                  barCount={24}
                  className="h-10"
                />
              )}

              <button
                type="button"
                onClick={onSwitchToText}
                className="text-[10px] text-white/40 hover:text-white/70 transition-colors self-start"
              >
                Switch to text →
              </button>
            </div>

            {/* Controls */}
            <div className="flex shrink-0 items-center gap-2">
              {/* Mute toggle */}
              <button
                type="button"
                onClick={onToggleMute}
                disabled={!isConnected}
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full
                  transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${
                    isMuted
                      ? "bg-[#ef4444] text-white"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }
                `}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>

              {/* End call */}
              <button
                type="button"
                onClick={onEndCall}
                disabled={!isConnected && !isConnecting}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ef4444] hover:bg-[#dc2626] text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="End voice session"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
