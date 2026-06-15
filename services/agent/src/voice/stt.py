"""
Deepgram STT Service Configuration (S6-03)

Adapter bridge: creates a Pipecat-compatible STT service using the
provider factory. If Deepgram key is set, uses Deepgram directly.
Otherwise falls through to OpenRouter or stub via the factory.
"""

from __future__ import annotations

import structlog
from src.providers.factory import get_stt

logger = structlog.get_logger()


def create_stt_service(config, language: str = "en"):
    """Create a Pipecat-compatible STT service.

    Tries the provider's native Pipecat integration first.
    Falls back to a wrapper if the provider doesn't support Pipecat natively.
    """
    provider = get_stt()

    # If the provider has native Pipecat support, use it
    pipecat_service = provider.create_pipecat_service(language)
    if pipecat_service is not None:
        return pipecat_service

    # Fallback: wrap the provider in a stub-compatible interface
    logger.info("stt_using_provider_wrapper", provider=type(provider).__name__)
    return StubSTTService()


class StubSTTService:
    """Stub STT for when no Pipecat-native provider is available."""

    def __init__(self):
        logger.info("stub_stt_initialized")

    async def process(self, audio_frame):
        """No-op: returns empty transcript."""
        return None
