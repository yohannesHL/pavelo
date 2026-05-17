"use client";

/**
 * Voice Session Page — /voice (S6-05)
 *
 * Full-screen voice interface for talking to Xara.
 * Dark navy background with gold accent elements.
 * Responsive: mobile bottom sheet controls.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { useVoiceSession } from "@/hooks/use-voice-session";
import {
  VoiceWaveform,
  VoiceTranscription,
  VoiceControls,
  XaraAvatar,
  ConnectionStatus,
  LanguageSelector,
  RecordingConsent,
} from "@/components/voice";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/i18n";

export default function VoicePage() {
  const router = useRouter();
  const { user, initialize } = useAuthStore();
  const { t } = useTranslation();
  const [language, setLanguage] = useState("en");
  const [recordingConsent, setRecordingConsent] = useState(false);
  const {
    connect,
    disconnect,
    connectionState,
    error,
    isMuted,
    toggleMute,
    audioLevel,
    agentAudioLevel,
    agentState,
    sessionData,
    transcripts,
    currentInterim,
    durationSecs,
  } = useVoiceSession();

  // Initialize auth
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleStartCall = useCallback(() => {
    connect({ language, recordingConsent });
  }, [connect, language, recordingConsent]);

  const handleEndCall = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  const isIdle =
    connectionState === "idle" || connectionState === "disconnected";
  const isActive =
    connectionState === "connected" ||
    connectionState === "connecting" ||
    connectionState === "requesting";

  return (
    <div className="voice-page relative flex flex-col h-[calc(100vh-65px)] overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1B2A] via-[#132B4D] to-[#1B3A6B] -z-10" />

      {/* Connection status bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <ConnectionStatus state={connectionState} error={error} />

        {sessionData?.conversationId && (
          <button
            onClick={() =>
              router.push(`/chat/${sessionData.conversationId}`)
            }
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            {t("voice.viewInChat")} →
          </button>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
        {/* Idle state — start button */}
        {isIdle && !error && (
          <div className="flex flex-col items-center gap-8 animate-in fade-in duration-500">
            <XaraAvatar state="listening" size="lg" />

            <div className="text-center mt-4">
              <h1
                className="text-2xl sm:text-3xl font-bold text-white mb-2"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t("voice.title")}
              </h1>
              <p className="text-white/50 text-sm sm:text-base max-w-md">
                {t("voice.subtitle")}
              </p>
            </div>

            <button
              onClick={handleStartCall}
              disabled={!user}
              className="
                flex items-center gap-3
                px-8 py-4 rounded-full
                bg-[#F4A261] hover:bg-[#F6B87A]
                text-[#0D1B2A] font-semibold text-lg
                transition-all duration-200
                shadow-lg shadow-[#F4A261]/25
                hover:shadow-xl hover:shadow-[#F4A261]/30
                hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-[#F4A261]/50 focus:ring-offset-2 focus:ring-offset-[#0D1B2A]
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
              "
              aria-label="Start voice session"
            >
              <Phone className="h-5 w-5" />
              {user ? t("voice.startCall") : t("voice.signInRequired")}
            </button>

            {/* Language & consent options */}
            {user && (
              <div className="flex flex-col items-center gap-4 mt-2">
                <LanguageSelector
                  value={language}
                  onChange={setLanguage}
                  disabled={isActive}
                />
                <RecordingConsent
                  checked={recordingConsent}
                  onChange={setRecordingConsent}
                  className="max-w-xs"
                />
              </div>
            )}

            {!user && (
              <p className="text-white/30 text-xs">
                <a href="/auth/login" className="text-[#2E86AB] hover:underline">
                  Sign in
                </a>{" "}
                {t("voice.signInRequired")}
              </p>
            )}
          </div>
        )}

        {/* Active session */}
        {isActive && (
          <div className="flex flex-col items-center gap-6 w-full max-w-lg animate-in fade-in duration-300">
            {/* Avatar */}
            <XaraAvatar
              state={agentState}
              audioLevel={agentAudioLevel}
              size="lg"
            />

            {/* Waveform */}
            <div className="w-full mt-4">
              <VoiceWaveform
                audioLevel={
                  agentState === "speaking" ? agentAudioLevel : audioLevel
                }
                isActive={connectionState === "connected"}
              />
            </div>

            {/* Transcription overlay */}
            <div className="w-full rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
              <VoiceTranscription
                transcripts={transcripts}
                currentInterim={currentInterim}
                className="h-32 sm:h-40"
              />
            </div>
          </div>
        )}

        {/* Error state */}
        {connectionState === "error" && error && (
          <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
            <XaraAvatar state="listening" size="lg" />

            <div className="text-center">
              <p className="text-[#ef4444] text-sm mb-4">{error}</p>
              <button
                onClick={handleStartCall}
                className="
                  px-6 py-3 rounded-full
                  bg-white/10 hover:bg-white/20
                  text-white font-medium
                  border border-white/20
                  transition-all duration-200
                "
              >
                {t("voice.tryAgain")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls — fixed on mobile */}
      {isActive && (
        <div className="shrink-0 pb-6 sm:pb-8 pt-4 px-4">
          <VoiceControls
            connectionState={connectionState}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onEndCall={handleEndCall}
            audioLevel={audioLevel}
            durationSecs={durationSecs}
          />
        </div>
      )}
    </div>
  );
}
