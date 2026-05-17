"""
Voice Pipeline Module (S6-03, S6-04)

Pipecat-based voice pipeline for Xara:
- LiveKit transport (WebRTC)
- Silero VAD for speech detection
- Deepgram Nova-3 for STT
- LangGraph agent for response generation
- Cartesia Sonic for TTS

Architecture:
  User Speech → VAD → Deepgram STT → Agent → Cartesia TTS → User Audio
"""
