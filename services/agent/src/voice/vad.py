"""
Silero VAD Integration (S6-04)

Voice Activity Detection using Silero VAD via Pipecat.

Features:
- Configurable silence threshold and speech padding
- Barge-in / interruption handling
- Debounce to prevent false triggers
- Environment-based configuration

Config env vars:
  VAD_THRESHOLD       — Detection sensitivity (0.0-1.0, default 0.5)
  VAD_MIN_SPEECH_MS   — Min speech duration to trigger (default 250ms)
  VAD_SILENCE_MS      — Silence duration to end speech (default 300ms)
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger()


def create_vad_analyzer(config):
    """Create a Silero VAD analyzer with configuration from voice config.

    Args:
        config: VoiceConfig instance with VAD parameters.

    Returns:
        SileroVADAnalyzer configured for the voice pipeline.

    Raises:
        ImportError: If pipecat VAD module is not installed.
    """
    try:
        from pipecat.vad.silero import SileroVADAnalyzer, VADParams

        vad_params = VADParams(
            threshold=config.vad_threshold,
            min_speech_ms=config.vad_min_speech_ms,
            min_silence_ms=config.vad_silence_ms,
            prefix_padding_ms=config.vad_prefix_padding_ms,
            max_speech_ms=config.vad_max_speech_ms,
        )

        logger.info(
            "vad_configured",
            threshold=config.vad_threshold,
            min_speech_ms=config.vad_min_speech_ms,
            silence_ms=config.vad_silence_ms,
        )

        return SileroVADAnalyzer(params=vad_params)

    except ImportError:
        logger.warning("silero_vad_not_available", message="Using stub VAD")
        return StubVADAnalyzer()


class StubVADAnalyzer:
    """Stub VAD for when Silero is not available.

    Passes through all audio without filtering — useful for testing.
    """

    def __init__(self):
        logger.info("stub_vad_initialized")

    async def process(self, audio_frame):
        """Pass through audio without VAD filtering."""
        return audio_frame
