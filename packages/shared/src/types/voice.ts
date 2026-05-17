import { z } from "zod";

// --- Voice Session Status ---
export const VoiceSessionStatus = z.enum(["active", "ended", "failed", "timeout"]);
export type VoiceSessionStatus = z.infer<typeof VoiceSessionStatus>;

// --- Voice Session Schema ---
export const VoiceSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  roomName: z.string(),
  status: VoiceSessionStatus,
  language: z.string(),
  recordingConsent: z.boolean(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  durationSecs: z.number().optional(),
  interruptionCount: z.number().default(0),
  toolCallCount: z.number().default(0),
  metadata: z.record(z.unknown()).optional(),
});
export type VoiceSession = z.infer<typeof VoiceSessionSchema>;

// --- Voice Connection State ---
export const VoiceConnectionState = z.enum([
  "idle",
  "requesting",
  "connecting",
  "connected",
  "disconnecting",
  "disconnected",
  "error",
]);
export type VoiceConnectionState = z.infer<typeof VoiceConnectionState>;

// --- Agent Speaking State ---
export const AgentSpeakingState = z.enum(["listening", "thinking", "speaking"]);
export type AgentSpeakingState = z.infer<typeof AgentSpeakingState>;

// --- Transcript Entry ---
export const TranscriptEntrySchema = z.object({
  id: z.string(),
  text: z.string(),
  isFinal: z.boolean(),
  speaker: z.enum(["user", "agent"]),
  timestamp: z.number(),
});
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

// --- Voice Session Create Response ---
export const VoiceSessionCreateResponseSchema = z.object({
  sessionId: z.string().uuid(),
  roomName: z.string(),
  token: z.string(),
  livekitUrl: z.string(),
  conversationId: z.string().uuid(),
  language: z.string(),
});
export type VoiceSessionCreateResponse = z.infer<typeof VoiceSessionCreateResponseSchema>;

// --- Voice Metrics ---
export const VoiceMetricsSchema = z.object({
  totalSessions: z.number(),
  completedSessions: z.number(),
  failedSessions: z.number(),
  totalDurationSecs: z.number(),
  avgDurationSecs: z.number(),
  totalInterruptions: z.number(),
  totalToolCalls: z.number(),
  avgTtfbMs: z.number().nullable(),
  languageDistribution: z.record(z.number()),
  period: z.string(),
});
export type VoiceMetrics = z.infer<typeof VoiceMetricsSchema>;

// --- Supported Languages (S6-08) ---
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "zh", name: "Mandarin", nativeName: "中文" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];
