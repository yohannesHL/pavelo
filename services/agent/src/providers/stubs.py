"""
Stub providers — used when no API keys are configured.

Return canned responses so the app doesn't crash.
"""

from __future__ import annotations

from typing import AsyncIterator

import structlog

from .base import (
    LLMProvider, LLMMessage, LLMResponse,
    STTProvider, STTResult,
    TTSProvider, TTSResult,
)

logger = structlog.get_logger()


class StubLLM(LLMProvider):
    """Returns canned responses when no LLM provider is configured."""

    async def complete(self, messages: list[LLMMessage], **kwargs) -> LLMResponse:
        logger.warning("stub_llm_complete", message="No LLM API key configured")
        return LLMResponse(content=self._stub_text(messages), model="stub")

    async def stream(self, messages: list[LLMMessage], **kwargs) -> AsyncIterator[str]:
        logger.warning("stub_llm_stream", message="No LLM API key configured")
        yield self._stub_text(messages)

    async def complete_with_tools(self, messages: list[LLMMessage], tools: list[dict], **kwargs) -> dict:
        logger.warning("stub_llm_tools", message="No LLM API key configured")
        return {"tool_calls": [], "content": ""}

    @staticmethod
    def _stub_text(messages: list[LLMMessage]) -> str:
        last = messages[-1].content.lower() if messages else ""
        if any(w in last for w in ("hello", "hi", "hey")):
            return "Hello! I'm Xara, your AI estate agent. I'm running in demo mode — please configure an LLM API key for full functionality."
        return "I'm running in demo mode without an LLM provider. Set OPENROUTER_API_KEY or OPENAI_API_KEY to enable AI responses."


class StubSTT(STTProvider):
    """No-op STT."""

    async def transcribe(self, audio_data: bytes, **kwargs) -> STTResult:
        logger.warning("stub_stt", message="No STT provider configured")
        return STTResult(text="", confidence=0.0)


class StubTTS(TTSProvider):
    """No-op TTS."""

    async def synthesize(self, text: str, **kwargs) -> TTSResult:
        logger.warning("stub_tts", text_preview=text[:60])
        return TTSResult(audio_data=b"", sample_rate=24000)
