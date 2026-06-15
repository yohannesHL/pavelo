"""
Deepgram STT adapter.

Used when DEEPGRAM_API_KEY is set. Falls through to OpenRouter STT otherwise.
"""

from __future__ import annotations

import structlog

from .base import STTProvider, STTResult

logger = structlog.get_logger()

DEEPGRAM_LANGUAGE_MAP = {
    "en": "en-US",
    "es": "es",
    "fr": "fr",
    "ar": "ar",
    "hi": "hi",
    "zh": "zh-CN",
}


class DeepgramSTT(STTProvider):
    """STT via the Deepgram Nova API."""

    def __init__(self, api_key: str, model: str = "nova-3"):
        self._api_key = api_key
        self._model = model

    async def transcribe(self, audio_data: bytes, *, language: str = "en") -> STTResult:
        try:
            from deepgram import DeepgramClient, PrerecordedOptions

            dg = DeepgramClient(self._api_key)
            options = PrerecordedOptions(
                model=self._model,
                language=DEEPGRAM_LANGUAGE_MAP.get(language, "en-US"),
                smart_format=True,
                punctuate=True,
            )
            response = await dg.listen.asyncrest.v("1").transcribe_file(
                {"buffer": audio_data, "mimetype": "audio/wav"}, options
            )
            text = response.results.channels[0].alternatives[0].transcript
            confidence = response.results.channels[0].alternatives[0].confidence
            return STTResult(text=text, confidence=confidence, language=language)

        except ImportError:
            logger.warning("deepgram_sdk_not_installed")
            return STTResult(text="", confidence=0.0)
        except Exception as e:
            logger.error("deepgram_stt_error", error=str(e))
            return STTResult(text="", confidence=0.0)

    def create_pipecat_service(self, language: str = "en"):
        """Create a Pipecat-compatible Deepgram STT service."""
        try:
            from pipecat.services.deepgram import DeepgramSTTService

            return DeepgramSTTService(
                api_key=self._api_key,
                model=self._model,
                language=DEEPGRAM_LANGUAGE_MAP.get(language, "en-US"),
                interim_results=True,
                smart_format=True,
                punctuate=True,
            )
        except ImportError:
            logger.warning("pipecat_deepgram_not_available")
            return None
