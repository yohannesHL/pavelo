# Sprint 6 — Voice Infrastructure — Progress

## Status: 🚧 In Progress

### Phase 1 — LiveKit Server & React SDK (S6-01, S6-02, S6-07)
- [x] S6-01: LiveKit server setup (docker-compose, API wrapper, token service, tRPC endpoints)
- [x] S6-02: LiveKit React SDK (useVoiceSession hook, audio tracks, connection state)
- [x] S6-07: Voice session management (DB model, session limits, state tracking)

### Phase 2 — Pipecat Voice Pipeline (S6-03, S6-04)
- [x] S6-03: Pipecat pipeline (VAD → STT → Agent → TTS, LiveKit transport)
- [x] S6-04: VAD integration (Silero VAD, barge-in, configurable thresholds)

### Phase 3 — Voice UI & Transcription (S6-05, S6-06)
- [ ] S6-05: Voice session UI (waveform, transcription overlay, controls, Xara avatar)
- [ ] S6-06: Voice-to-chat transcript (save as messages, source tagging)

### Phase 4 — Multi-language, Persona & Monitoring (S6-08, S6-09, S6-10)
- [ ] S6-08: Multi-language support (language detection, multilingual TTS)
- [ ] S6-09: Voice persona (voice-specific prompt engineering)
- [ ] S6-10: Voice quality monitoring (TTFB, WER, session metadata)

---

## Decisions & Notes
- LiveKit docker-compose enhanced with UDP port 7882 and healthcheck
- VoiceSession Prisma model includes metrics fields (interruptionCount, toolCallCount, metadata) for S6-10
- Message model gets `source` field ("text"/"voice") for S6-06 transcript tagging
- User model gets `languagePreference` field for S6-08
- Token TTL set to 1 hour; rooms auto-cleanup after 5 min empty
- Concurrent session limit: strictly 1 active voice session per user
- useVoiceSession hook handles full lifecycle: create session → connect → audio → disconnect → cleanup
