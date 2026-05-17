"""
Voice Pipeline Configuration (S6-03)

Environment-based configuration for the Pipecat voice pipeline.
All API keys and model selections are loaded from env vars.
"""

from pydantic_settings import BaseSettings


class VoiceConfig(BaseSettings):
    """Voice pipeline configuration from environment variables."""

    # LiveKit
    livekit_url: str = "ws://localhost:7880"
    livekit_api_key: str = "devkey"
    livekit_api_secret: str = "secret"

    # Deepgram (STT)
    deepgram_api_key: str = ""
    deepgram_model: str = "nova-3"
    deepgram_language: str = "en"
    deepgram_interim_results: bool = True
    deepgram_smart_format: bool = True
    deepgram_punctuate: bool = True

    # Cartesia (TTS)
    cartesia_api_key: str = ""
    cartesia_voice_id: str = "a0e99841-438c-4a64-b679-ae501e7d6091"  # Warm female voice
    cartesia_model: str = "sonic-2"
    cartesia_language: str = "en"
    cartesia_speed: str = "normal"

    # VAD (S6-04)
    vad_threshold: float = 0.5
    vad_min_speech_ms: int = 250
    vad_silence_ms: int = 300
    vad_prefix_padding_ms: int = 300
    vad_max_speech_ms: int = 30000

    # Pipeline
    pipeline_sample_rate: int = 16000
    pipeline_channels: int = 1

    # Agent
    agent_participant_name: str = "Xara"
    agent_participant_identity: str = "xara-agent"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_prefix = ""


voice_config = VoiceConfig()
