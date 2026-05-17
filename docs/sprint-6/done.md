# Sprint 6 — Voice Infrastructure — Done

## Summary
Sprint 6 delivers the complete voice infrastructure for Pavelo/Xara. Users can now start a voice conversation with Xara directly from the `/voice` page. The backend Pipecat pipeline processes speech through VAD → Deepgram STT → LangGraph Agent → Cartesia TTS, and voice transcripts are saved to the same conversation timeline as text chat.

## Completed Tasks

### S6-01: LiveKit Server Setup ✅
- Enhanced `docker-compose.yml` with UDP port, healthcheck for LiveKit
- `apps/api/src/lib/livekit.ts`: token generation, room management wrapper
- Environment variables: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`

### S6-02: LiveKit React SDK Integration ✅
- `apps/web/src/hooks/use-voice-session.ts`: full lifecycle hook
- Audio track management: local microphone + remote agent audio
- Connection state machine: idle → requesting → connecting → connected → disconnected
- Error handling: permission denied, connection failed, room full
- Clean disconnect on unmount

### S6-03: Pipecat Pipeline ✅
- `services/agent/src/voice/pipeline.py`: VoicePipeline class
- Pipeline composition: VAD → Deepgram STT → AgentProcessor → Cartesia TTS
- LiveKit transport: agent joins room as participant
- `services/agent/src/voice/stt.py`: Deepgram Nova-3 streaming config
- `services/agent/src/voice/tts.py`: Cartesia Sonic low-latency config
- `services/agent/src/voice/agent_processor.py`: LangGraph bridge with barge-in
- Graceful fallback: stub services when deps not installed

### S6-04: VAD (Voice Activity Detection) ✅
- `services/agent/src/voice/vad.py`: Silero VAD integration
- Configurable: `VAD_THRESHOLD` (0.5), `VAD_MIN_SPEECH_MS` (250), `VAD_SILENCE_MS` (300)
- Barge-in handling: cancel TTS on user speech
- StubVADAnalyzer fallback for development

### S6-05: Voice Session UI ✅
- `apps/web/src/app/voice/page.tsx`: full-screen voice interface
- `VoiceWaveform`: canvas-based visualiser with gold bars
- `XaraAvatar`: animated with speaking/thinking/listening states
- `VoiceControls`: mute toggle, end call, volume indicator, duration
- `VoiceTranscription`: live scrolling transcript overlay
- `ConnectionStatus`: state indicator with crossfades
- Design: #0D1B2A navy gradient, #F4A261 gold accents
- Responsive: mobile-friendly with bottom controls
- Voice animations: voice-pulse, voice-think, voice-dot keyframes

### S6-06: Voice-to-Chat Transcript ✅
- `services/agent/src/voice/transcript.py`: TranscriptService
- `Message.source` field: "text" vs "voice" for unified timeline
- Updated `conversation.addMessage` tRPC endpoint with source param
- After voice session, full transcript visible in chat view

### S6-07: Voice Session Management API ✅
- `apps/api/src/routes/voice.ts`: full tRPC router
- `voice.createSession`: creates room + returns token
- `voice.endSession`: ends session, calculates duration, cleans up
- `voice.getActiveSession`: check for existing active session
- `voice.listSessions`: session history with pagination
- `VoiceSession` Prisma model with status, timing, metrics
- Concurrent session limit: 1 active per user

### S6-08: Multi-language Support ✅
- `services/agent/src/voice/languages.py`: 6 language configs
- Deepgram auto-language detection support
- Cartesia multilingual TTS voice selection
- `LanguageSelector` UI component
- `User.languagePreference` field in Prisma schema
- `apps/web/src/i18n/index.tsx`: i18n setup (English + Spanish)

### S6-09: Voice Persona ✅
- `services/agent/src/voice/persona.py`: voice-optimized system prompt
- Speaking style: shorter responses, natural pacing, no markdown
- Affirmation phrases and handover phrases
- Integrates with S5-10 persona system

### S6-10: Voice Quality Monitoring ✅
- `services/agent/src/voice/metrics.py`: SessionMetrics + MetricsCollector
- TTFB tracking (avg/min/max per session)
- WER placeholder: transcript logging for analysis
- `RecordingConsent` UI component (GDPR)
- `voice.getMetrics` tRPC endpoint with aggregate stats
- REST endpoint: `GET /api/v1/voice/metrics`
- Session metadata: duration, language, interruptions, tool calls

## Files Changed

### New Files (25)
- `apps/api/src/lib/livekit.ts`
- `apps/api/src/routes/voice.ts`
- `apps/web/src/hooks/use-voice-session.ts`
- `apps/web/src/components/voice/voice-waveform.tsx`
- `apps/web/src/components/voice/voice-transcription.tsx`
- `apps/web/src/components/voice/voice-controls.tsx`
- `apps/web/src/components/voice/xara-avatar.tsx`
- `apps/web/src/components/voice/connection-status.tsx`
- `apps/web/src/components/voice/language-selector.tsx`
- `apps/web/src/components/voice/recording-consent.tsx`
- `apps/web/src/components/voice/index.ts`
- `apps/web/src/i18n/index.tsx`
- `packages/shared/src/types/voice.ts`
- `services/agent/src/voice/__init__.py`
- `services/agent/src/voice/config.py`
- `services/agent/src/voice/pipeline.py`
- `services/agent/src/voice/vad.py`
- `services/agent/src/voice/stt.py`
- `services/agent/src/voice/tts.py`
- `services/agent/src/voice/agent_processor.py`
- `services/agent/src/voice/transcript.py`
- `services/agent/src/voice/persona.py`
- `services/agent/src/voice/languages.py`
- `services/agent/src/voice/metrics.py`
- `docs/sprint-6/progress.md`

### Modified Files (10)
- `docker-compose.yml` — LiveKit enhanced config
- `apps/api/prisma/schema.prisma` — VoiceSession model, Message.source, User.languagePreference
- `apps/api/src/router.ts` — voice router registration
- `apps/api/src/index.ts` — REST metrics endpoint
- `apps/api/src/routes/conversation.ts` — source field support
- `apps/web/src/app/voice/page.tsx` — full voice UI
- `apps/web/src/app/layout.tsx` — Voice nav link
- `apps/web/src/styles/globals.css` — voice animations
- `services/agent/src/main.py` — voice pipeline endpoints
- `services/agent/src/config.py` — voice config vars
- `services/agent/pyproject.toml` — voice optional deps
- `packages/shared/src/index.ts` — voice type exports

## Key Decisions
1. **Pipecat as optional dependency** — voice pipeline components fail gracefully with stub services when Pipecat is not installed, allowing development without full voice infrastructure
2. **1 active session limit** — strict enforcement at API level prevents resource waste and simplifies state management
3. **Source tagging** — `Message.source = "voice" | "text"` enables unified chat+voice timeline without separate models
4. **Canvas waveform** — chose canvas over CSS bars for smoother 60fps animation that reacts to real audio levels
5. **GDPR consent flow** — recording consent is opt-in per session, no audio stored, only text transcripts may be retained

## Environment Variables Added
```
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
DEEPGRAM_API_KEY=
CARTESIA_API_KEY=
VAD_THRESHOLD=0.5
VAD_MIN_SPEECH_MS=250
VAD_SILENCE_MS=300
```

## Handoff Notes for Sprint 7
- LiveKit server running in Docker via `docker compose up`
- Voice pipeline requires `pip install -e ".[voice]"` in services/agent
- Deepgram + Cartesia API keys needed for real STT/TTS
- Voice UI accessible at `/voice` — works in stub mode without API keys
- Conversation model supports both text and voice messages in unified timeline
