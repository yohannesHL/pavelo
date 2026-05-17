"""
Deepgram STT Service Configuration (S6-03)

Configures Deepgram Nova-3 for speech-to-text:
- Streaming recognition with interim results
- Smart formatting and punctuation
- Multi-language support (S6-08)
- Low-latency streaming mode
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger()

# Language code mapping for Deepgram
DEEPGRAM_LANGUAGE_MAP = {
    "en": "en-US",
    "es": "es",
    "fr": "fr",
    "ar": "ar",
    "hi": "hi",
    "zh": "zh-CN",
}


def create_stt_service(config, language: str = "en"):
    """Create a Deepgram STT service for the voice pipeline.

    Args:
        config: VoiceConfig instance.
        language: Language code (ISO 639-1).

    Returns:
        DeepgramSTTService configured for streaming recognition.
    """
    try:
        from pipecat.services.deepgram import DeepgramSTTService

        deepgram_lang = DEEPGRAM_LANGUAGE_MAP.get(language, "en-US")

        if not config.deepgram_api_key:
            logger.warning("deepgram_api_key_missing", message="STT will not work without API key")
            return StubSTTService()

        stt = DeepgramSTTService(
            api_key=config.deepgram_api_key,
            model=config.deepgram_model,
            language=deepgram_lang,
            interim_results=config.deepgram_interim_results,
            smart_format=config.deepgram_smart_format,
            punctuate=config.deepgram_punctuate,
        )

        logger.info(
            "stt_configured",
            model=config.deepgram_model,
            language=deepgram_lang,
        )

        return stt

    except ImportError:
        logger.warning("deepgram_stt_not_available", message="Using stub STT")
        return StubSTTService()


class StubSTTService:
    """Stub STT for when Deepgram is not available."""

    def __init__(self):
        logger.info("stub_stt_initialized")

    async def process(self, audio_frame):
        """No-op: returns empty transcript."""
        return None
