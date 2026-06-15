"""
Cartesia TTS adapter.

Used when CARTESIA_API_KEY is set. Falls through to OpenRouter TTS otherwise.
"""

from __future__ import annotations

import structlog

from .base import TTSProvider, TTSResult

logger = structlog.get_logger()

CARTESIA_VOICE_MAP = {
    "en": "a0e99841-438c-4a64-b679-ae501e7d6091",  # Warm female (English)
    "es": "a0e99841-438c-4a64-b679-ae501e7d6091",
    "fr": "a0e99841-438c-4a64-b679-ae501e7d6091",
    "ar": "a0e99841-438c-4a64-b679-ae501e7d6091",
    "hi": "a0e99841-438c-4a64-b679-ae501e7d6091",
    "zh": "a0e99841-438c-4a64-b679-ae501e7d6091",
}


class CartesiaTTS(TTSProvider):
    """TTS via the Cartesia Sonic API."""

    def __init__(
        self,
        api_key: str,
        model: str = "sonic-2",
        voice_id: str = "a0e99841-438c-4a64-b679-ae501e7d6091",
        speed: str = "normal",
    ):
        self._api_key = api_key
        self._model = model
        self._voice_id = voice_id
        self._speed = speed

    async def synthesize(self, text: str, *, language: str = "en") -> TTSResult:
        try:
            import httpx

            voice_id = CARTESIA_VOICE_MAP.get(language, self._voice_id)
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.cartesia.ai/tts/bytes",
                    headers={
                        "X-API-Key": self._api_key,
                        "Cartesia-Version": "2024-06-10",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model_id": self._model,
                        "transcript": text,
                        "voice": {"mode": "id", "id": voice_id},
                        "output_format": {"container": "raw", "encoding": "pcm_s16le", "sample_rate": 24000},
                        "language": language,
                        "speed": self._speed,
                    },
                )
                resp.raise_for_status()
                return TTSResult(audio_data=resp.content, sample_rate=24000, format="pcm")

        except Exception as e:
            logger.error("cartesia_tts_error", error=str(e))
            return TTSResult(audio_data=b"", sample_rate=24000)

    def create_pipecat_service(self, language: str = "en"):
        """Create a Pipecat-compatible Cartesia TTS service."""
        try:
            from pipecat.services.cartesia import CartesiaTTSService

            voice_id = CARTESIA_VOICE_MAP.get(language, self._voice_id)
            return CartesiaTTSService(
                api_key=self._api_key,
                voice_id=voice_id,
                model=self._model,
                language=language,
                speed=self._speed,
            )
        except ImportError:
            logger.warning("pipecat_cartesia_not_available")
            return None
