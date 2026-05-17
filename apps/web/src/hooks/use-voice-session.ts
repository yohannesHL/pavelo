"use client";

/**
 * useVoiceSession — LiveKit voice session management hook (S6-02)
 *
 * Manages the full lifecycle of a voice session:
 * - Session creation (API call → LiveKit token)
 * - Room connection (LiveKit SDK)
 * - Audio track management (local mic, remote agent)
 * - Connection state tracking
 * - Audio level monitoring
 * - Clean disconnect on unmount
 *
 * Usage:
 *   const { connect, disconnect, connectionState, isMuted, toggleMute, audioLevel } = useVoiceSession();
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  LocalParticipant,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  type AudioCaptureOptions,
} from "livekit-client";
import { createClient } from "@/lib/supabase/client";

// --- Types ---

export type VoiceConnectionState =
  | "idle"
  | "requesting"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected"
  | "error";

export type AgentSpeakingState = "listening" | "thinking" | "speaking";

export interface VoiceSessionData {
  sessionId: string;
  roomName: string;
  token: string;
  livekitUrl: string;
  conversationId: string;
  language: string;
}

export interface TranscriptEntry {
  id: string;
  text: string;
  isFinal: boolean;
  speaker: "user" | "agent";
  timestamp: number;
}

export interface UseVoiceSessionReturn {
  // Connection
  connect: (options?: { language?: string; recordingConsent?: boolean; conversationId?: string }) => Promise<void>;
  disconnect: () => Promise<void>;
  connectionState: VoiceConnectionState;
  error: string | null;

  // Audio controls
  isMuted: boolean;
  toggleMute: () => void;
  audioLevel: number;          // 0-1, current user mic level
  agentAudioLevel: number;     // 0-1, current agent audio level

  // State
  agentState: AgentSpeakingState;
  sessionData: VoiceSessionData | null;

  // Transcription
  transcripts: TranscriptEntry[];
  currentInterim: string;

  // Duration
  durationSecs: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export function useVoiceSession(): UseVoiceSessionReturn {
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [agentAudioLevel, setAgentAudioLevel] = useState(0);
  const [agentState, setAgentState] = useState<AgentSpeakingState>("listening");
  const [sessionData, setSessionData] = useState<VoiceSessionData | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [currentInterim, setCurrentInterim] = useState("");
  const [durationSecs, setDurationSecs] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioLevelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Create session via API ---
  const createSession = useCallback(
    async (options: {
      language?: string;
      recordingConsent?: boolean;
      conversationId?: string;
    } = {}): Promise<VoiceSessionData> => {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${API_URL}/trpc/voice.createSession`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: options.language || "en",
          recordingConsent: options.recordingConsent || false,
          conversationId: options.conversationId,
        }),
      });

      const data = await res.json();
      const result = data?.result?.data;

      if (!result?.token) {
        const errorMsg = data?.error?.message || "Failed to create voice session";
        throw new Error(errorMsg);
      }

      return result as VoiceSessionData;
    },
    []
  );

  // --- End session via API ---
  const endSession = useCallback(async (sessionId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      await fetch(`${API_URL}/trpc/voice.endSession`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
    } catch (err: unknown) {
      console.warn("Failed to end session via API:", err);
    }
  }, []);

  // --- Connect to voice session ---
  const connect = useCallback(
    async (options: {
      language?: string;
      recordingConsent?: boolean;
      conversationId?: string;
    } = {}) => {
      if (connectionState === "connecting" || connectionState === "connected") {
        return;
      }

      setError(null);
      setConnectionState("requesting");

      try {
        // 1. Create session via API
        const session = await createSession(options);
        setSessionData(session);
        setConnectionState("connecting");

        // 2. Create and connect LiveKit room
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } as AudioCaptureOptions,
        });

        roomRef.current = room;

        // --- Room Event Handlers ---

        room.on(RoomEvent.Connected, () => {
          setConnectionState("connected");
          // Start duration timer
          const startTime = Date.now();
          durationIntervalRef.current = setInterval(() => {
            setDurationSecs(Math.floor((Date.now() - startTime) / 1000));
          }, 1000);
        });

        room.on(RoomEvent.Disconnected, () => {
          setConnectionState("disconnected");
          cleanup();
        });

        room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          if (state === ConnectionState.Reconnecting) {
            setConnectionState("connecting");
          }
        });

        room.on(
          RoomEvent.TrackSubscribed,
          (
            track: RemoteTrack,
            _publication: RemoteTrackPublication,
            participant: RemoteParticipant
          ) => {
            if (track.kind === Track.Kind.Audio) {
              // Agent audio — attach to hidden audio element
              const el = track.attach();
              el.id = "agent-audio";
              document.body.appendChild(el);
              audioElementRef.current = el;

              // Track agent speaking state by audio level
              setAgentState("speaking");
            }
          }
        );

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Audio) {
            track.detach().forEach((el) => el.remove());
            audioElementRef.current = null;
            setAgentState("listening");
          }
        });

        // Handle data messages (transcription events from agent)
        room.on(RoomEvent.DataReceived, (data: Uint8Array, participant?: RemoteParticipant) => {
          try {
            const text = new TextDecoder().decode(data);
            const msg = JSON.parse(text);

            if (msg.type === "transcription") {
              if (msg.isFinal) {
                setTranscripts((prev) => [
                  ...prev,
                  {
                    id: `t-${Date.now()}`,
                    text: msg.text,
                    isFinal: true,
                    speaker: msg.speaker || "user",
                    timestamp: Date.now(),
                  },
                ]);
                setCurrentInterim("");
              } else {
                setCurrentInterim(msg.text);
              }
            } else if (msg.type === "agent_state") {
              setAgentState(msg.state as AgentSpeakingState);
            }
          } catch {
            // Ignore non-JSON data
          }
        });

        room.on(RoomEvent.MediaDevicesError, (err: Error) => {
          if (err.message.includes("Permission")) {
            setError("Microphone permission denied. Please allow microphone access.");
          } else {
            setError(`Media device error: ${err.message}`);
          }
        });

        // 3. Connect to room
        await room.connect(session.livekitUrl, session.token);

        // 4. Publish local microphone
        await room.localParticipant.setMicrophoneEnabled(true);

        // 5. Start audio level monitoring
        audioLevelIntervalRef.current = setInterval(() => {
          // Local (user) audio level
          const localPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
          if (localPub?.track) {
            // Get audio level from the track's audio context
            setAudioLevel(localPub.track.currentBitrate ? Math.min(1, localPub.track.currentBitrate / 100000) : 0);
          }

          // Agent audio level (check remote participants)
          for (const participant of room.remoteParticipants.values()) {
            const audioPub = participant.getTrackPublication(Track.Source.Microphone);
            if (audioPub?.track) {
              setAgentAudioLevel(audioPub.track.currentBitrate ? Math.min(1, audioPub.track.currentBitrate / 100000) : 0);
            }
          }
        }, 100);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Connection failed";
        setError(message);
        setConnectionState("error");
      }
    },
    [connectionState, createSession]
  );

  // --- Cleanup helper ---
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }
    setAudioLevel(0);
    setAgentAudioLevel(0);
    setAgentState("listening");
  }, []);

  // --- Disconnect ---
  const disconnect = useCallback(async () => {
    setConnectionState("disconnecting");

    const room = roomRef.current;
    const session = sessionData;

    // Disconnect from LiveKit
    if (room) {
      room.disconnect();
      roomRef.current = null;
    }

    // End session via API
    if (session) {
      await endSession(session.sessionId);
    }

    cleanup();
    setConnectionState("disconnected");
    setSessionData(null);
    setDurationSecs(0);
    setTranscripts([]);
    setCurrentInterim("");
  }, [sessionData, endSession, cleanup]);

  // --- Toggle mute ---
  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const newMuted = !isMuted;
    room.localParticipant.setMicrophoneEnabled(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  // --- Clean up on unmount ---
  useEffect(() => {
    return () => {
      const room = roomRef.current;
      if (room) {
        room.disconnect();
        roomRef.current = null;
      }
      cleanup();
      // End session if still active
      if (sessionData) {
        endSession(sessionData.sessionId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
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
  };
}
