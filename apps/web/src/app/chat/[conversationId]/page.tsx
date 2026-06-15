"use client";

/**
 * /chat/[conversationId] — Active conversation page
 *
 * Loads conversation history, connects to WebSocket room,
 * and integrates voice session for unified experience.
 */

import { useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { useVoiceSession } from "@/hooks/use-voice-session";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  const {
    messages,
    isAgentTyping,
    connectionStatus,
    conversationId: currentConvId,
    voiceActive,
    interimTranscript,
    sendMessage,
    joinRoom,
    loadMessages,
    clearMessages,
    setVoiceActive,
    addVoiceTranscript,
    setInterimTranscript,
  } = useChatStore();

  const voice = useVoiceSession();

  // Disconnect voice when switching conversations (#67)
  useEffect(() => {
    if (conversationId && conversationId !== currentConvId) {
      if (voiceActive) {
        voice.disconnect();
        setVoiceActive(false);
      }
      clearMessages();
      loadMessages(conversationId);
      joinRoom(conversationId);
    }
  }, [conversationId, currentConvId, voiceActive, voice, clearMessages, loadMessages, joinRoom, setVoiceActive]);

  // Clean up voice session on unmount (#66)
  useEffect(() => {
    return () => {
      const store = useChatStore.getState();
      if (store.voiceActive) {
        voice.disconnect();
        store.setVoiceActive(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-connect voice if voiceActive was set before navigation (e.g. from ?voice=true)
  useEffect(() => {
    if (voiceActive && voice.connectionState === "idle" && conversationId) {
      voice.connect({ conversationId, language: "en", recordingConsent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceActive, conversationId]);

  // Voice transcripts → chat bubbles
  const prevTranscriptCount = useRef(0);
  useEffect(() => {
    const newTranscripts = voice.transcripts.slice(prevTranscriptCount.current);
    newTranscripts.forEach((t) => {
      addVoiceTranscript({ id: t.id, text: t.text, speaker: t.speaker });
    });
    prevTranscriptCount.current = voice.transcripts.length;
  }, [voice.transcripts, addVoiceTranscript]);

  // Interim transcript sync
  useEffect(() => {
    setInterimTranscript(voice.currentInterim || null);
  }, [voice.currentInterim, setInterimTranscript]);

  // Voice toggle handler
  const handleVoiceToggle = useCallback(() => {
    if (voiceActive) {
      voice.disconnect();
      setVoiceActive(false);
    } else {
      voice.connect({ conversationId, language: "en", recordingConsent: true });
      setVoiceActive(true);
    }
  }, [voiceActive, voice, conversationId, setVoiceActive]);

  const handleEndVoice = useCallback(() => {
    voice.disconnect();
    setVoiceActive(false);
  }, [voice, setVoiceActive]);

  // Listen for suggestion clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const suggestion = (e as CustomEvent).detail;
      if (suggestion) {
        sendMessage(suggestion);
      }
    };

    window.addEventListener("chat-suggestion", handler);
    return () => window.removeEventListener("chat-suggestion", handler);
  }, [sendMessage]);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content);
    },
    [sendMessage]
  );

  return (
    <>
      {/* Connection status bar */}
      {connectionStatus === "connecting" && (
        <div className="flex items-center justify-center gap-2 bg-[var(--color-gold)]/10 px-4 py-1.5 text-xs text-[var(--color-gold)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-gold)]" />
          Connecting to Xara...
        </div>
      )}
      {connectionStatus === "error" && (
        <div className="flex items-center justify-center gap-2 bg-[var(--color-error)]/10 px-4 py-1.5 text-xs text-[var(--color-error)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-error)]" />
          Connection lost — retrying...
        </div>
      )}

      {/* Messages */}
      <ChatMessageList
        messages={messages}
        isAgentTyping={isAgentTyping}
        interimTranscript={interimTranscript}
      />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={connectionStatus !== "connected"}
        voiceActive={voiceActive}
        onVoiceToggle={handleVoiceToggle}
        voiceDisabled={connectionStatus !== "connected"}
        voiceConnectionState={voice.connectionState}
        isMuted={voice.isMuted}
        onToggleMute={voice.toggleMute}
        audioLevel={voice.audioLevel}
        agentAudioLevel={voice.agentAudioLevel}
        agentState={voice.agentState}
        onEndVoice={handleEndVoice}
      />
    </>
  );
}
