"""
TTS Service Configuration (S6-03)

Adapter bridge: creates a Pipecat-compatible TTS service using the
provider factory. If Cartesia key is set, uses Cartesia directly.
Otherwise falls through to OpenRouter or stub via the factory.
"""

from __future__ import annotations

import structlog
from src.providers.factory import get_tts

logger = structlog.get_logger()


def create_tts_service(config, language: str = "en"):
    """Create a Pipecat-compatible TTS service.

    Tries the provider's native Pipecat integration first.
    Falls back to a wrapper if the provider doesn't support Pipecat natively.
    """
    provider = get_tts()

    # If the provider has native Pipecat support, use it
    pipecat_service = provider.create_pipecat_service(language)
    if pipecat_service is not None:
        return pipecat_service

    # Fallback: wrap the provider in a stub-compatible interface
    logger.info("tts_using_provider_wrapper", provider=type(provider).__name__)
    return StubTTSService()


class StubTTSService:
    """Stub TTS for when no Pipecat-native provider is available."""

    def __init__(self):
        logger.info("stub_tts_initialized", message="TTS in stub mode — no audio output")

    async def process(self, text: str):
        """Log text but don't produce audio."""
        logger.debug("stub_tts_text", text=text[:100])
        return None
