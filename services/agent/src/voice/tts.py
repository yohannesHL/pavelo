"""
Cartesia TTS Service Configuration (S6-03)

Configures Cartesia Sonic for text-to-speech:
- Low-latency streaming synthesis
- Estate agent persona voice (warm, professional)
- Multi-language support (S6-08)
- Graceful fallback if unavailable
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger()

# Voice IDs for different languages (Cartesia multilingual voices)
CARTESIA_VOICE_MAP = {
    "en": "a0e99841-438c-4a64-b679-ae501e7d6091",  # Warm female (English)
    "es": "a0e99841-438c-4a64-b679-ae501e7d6091",  # Same voice, Spanish mode
    "fr": "a0e99841-438c-4a64-b679-ae501e7d6091",  # Same voice, French mode
    "ar": "a0e99841-438c-4a64-b679-ae501e7d6091",  # Same voice, Arabic mode
    "hi": "a0e99841-438c-4a64-b679-ae501e7d6091",  # Same voice, Hindi mode
    "zh": "a0e99841-438c-4a64-b679-ae501e7d6091",  # Same voice, Mandarin mode
}


def create_tts_service(config, language: str = "en"):
    """Create a Cartesia TTS service for the voice pipeline.

    Args:
        config: VoiceConfig instance.
        language: Language code (ISO 639-1).

    Returns:
        CartesiaTTSService configured for low-latency streaming.

    Note:
        If Cartesia is unavailable (no API key or import error),
        returns a stub that logs warnings but doesn't crash the pipeline.
    """
    try:
        from pipecat.services.cartesia import CartesiaTTSService

        if not config.cartesia_api_key:
            logger.warning(
                "cartesia_api_key_missing",
                message="TTS will not work without API key. Running in stub mode.",
            )
            return StubTTSService()

        voice_id = CARTESIA_VOICE_MAP.get(language, config.cartesia_voice_id)

        tts = CartesiaTTSService(
            api_key=config.cartesia_api_key,
            voice_id=voice_id,
            model=config.cartesia_model,
            language=language,
            speed=config.cartesia_speed,
        )

        logger.info(
            "tts_configured",
            model=config.cartesia_model,
            voice_id=voice_id,
            language=language,
        )

        return tts

    except ImportError:
        logger.warning(
            "cartesia_tts_not_available",
            message="Cartesia not installed. TTS disabled.",
        )
        return StubTTSService()


class StubTTSService:
    """Stub TTS for when Cartesia is not available.

    Logs the text that would have been spoken but doesn't produce audio.
    Pipeline continues to function without TTS output.
    """

    def __init__(self):
        logger.info("stub_tts_initialized", message="TTS in stub mode — no audio output")

    async def process(self, text: str):
        """Log text but don't produce audio."""
        logger.debug("stub_tts_text", text=text[:100])
        return None
