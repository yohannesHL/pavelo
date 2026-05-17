"""
Provider factory — resolves which adapter to use based on env vars.

Priority order:
  LLM:  OPENAI_API_KEY → OPENROUTER_API_KEY → Stub
  STT:  DEEPGRAM_API_KEY → OPENROUTER_API_KEY → Stub
  TTS:  CARTESIA_API_KEY → OPENROUTER_API_KEY → Stub

All providers are singletons — created once and reused.
"""

from __future__ import annotations

import os

import structlog

from .base import LLMProvider, STTProvider, TTSProvider

logger = structlog.get_logger()

# Singletons
_llm: LLMProvider | None = None
_stt: STTProvider | None = None
_tts: TTSProvider | None = None


def get_llm() -> LLMProvider:
    """Get the configured LLM provider."""
    global _llm
    if _llm is not None:
        return _llm

    openai_key = os.getenv("OPENAI_API_KEY", "")
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
    model = os.getenv("LLM_MODEL", "")

    if openai_key:
        from .openai_provider import OpenAILLM
        _llm = OpenAILLM(api_key=openai_key, default_model=model or "gpt-4o-mini")
        logger.info("llm_provider_initialized", provider="openai", model=model or "gpt-4o-mini")

    elif openrouter_key:
        from .openrouter import OpenRouterLLM, DEFAULT_CHAT_MODEL
        _llm = OpenRouterLLM(api_key=openrouter_key, default_model=model or DEFAULT_CHAT_MODEL)
        logger.info("llm_provider_initialized", provider="openrouter", model=model or DEFAULT_CHAT_MODEL)

    else:
        from .stubs import StubLLM
        _llm = StubLLM()
        logger.warning("llm_provider_stub", message="No OPENAI_API_KEY or OPENROUTER_API_KEY set")

    return _llm


def get_stt() -> STTProvider:
    """Get the configured STT provider."""
    global _stt
    if _stt is not None:
        return _stt

    deepgram_key = os.getenv("DEEPGRAM_API_KEY", "")
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
    stt_model = os.getenv("STT_MODEL", "")

    if deepgram_key:
        from .deepgram_provider import DeepgramSTT
        _stt = DeepgramSTT(api_key=deepgram_key, model=stt_model or "nova-3")
        logger.info("stt_provider_initialized", provider="deepgram", model=stt_model or "nova-3")

    elif openrouter_key:
        from .openrouter import OpenRouterSTT
        _stt = OpenRouterSTT(api_key=openrouter_key, model=stt_model or "openai/whisper-large-v3")
        logger.info("stt_provider_initialized", provider="openrouter", model=stt_model or "openai/whisper-large-v3")

    else:
        from .stubs import StubSTT
        _stt = StubSTT()
        logger.warning("stt_provider_stub", message="No DEEPGRAM_API_KEY or OPENROUTER_API_KEY set")

    return _stt


def get_tts() -> TTSProvider:
    """Get the configured TTS provider."""
    global _tts
    if _tts is not None:
        return _tts

    cartesia_key = os.getenv("CARTESIA_API_KEY", "")
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
    tts_model = os.getenv("TTS_MODEL", "")
    tts_voice = os.getenv("TTS_VOICE", "")

    if cartesia_key:
        from .cartesia_provider import CartesiaTTS
        _tts = CartesiaTTS(api_key=cartesia_key, model=tts_model or "sonic-2")
        logger.info("tts_provider_initialized", provider="cartesia", model=tts_model or "sonic-2")

    elif openrouter_key:
        from .openrouter import OpenRouterTTS
        _tts = OpenRouterTTS(
            api_key=openrouter_key,
            model=tts_model or "openai/tts-1",
            voice=tts_voice or "nova",
        )
        logger.info("tts_provider_initialized", provider="openrouter", model=tts_model or "openai/tts-1")

    else:
        from .stubs import StubTTS
        _tts = StubTTS()
        logger.warning("tts_provider_stub", message="No CARTESIA_API_KEY or OPENROUTER_API_KEY set")

    return _tts


def reset_providers() -> None:
    """Reset all singletons (for testing)."""
    global _llm, _stt, _tts
    _llm = _stt = _tts = None
