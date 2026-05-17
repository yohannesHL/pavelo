"""
OpenRouter adapter — unified LLM, STT, and TTS via a single API key.

OpenRouter exposes an OpenAI-compatible API at https://openrouter.ai/api/v1
with access to hundreds of models including free ones.

STT/TTS: OpenRouter supports speech models via the same API.
"""

from __future__ import annotations

from typing import AsyncIterator

import structlog
from openai import AsyncOpenAI

from .base import (
    LLMProvider, LLMMessage, LLMResponse,
    STTProvider, STTResult,
    TTSProvider, TTSResult,
)

logger = structlog.get_logger()

# Sensible free/cheap defaults on OpenRouter
DEFAULT_CHAT_MODEL = "google/gemini-2.0-flash-exp:free"
DEFAULT_FAST_MODEL = "google/gemini-2.0-flash-exp:free"


class OpenRouterLLM(LLMProvider):
    """LLM completions via OpenRouter's OpenAI-compatible API."""

    def __init__(self, api_key: str, default_model: str = DEFAULT_CHAT_MODEL):
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={"HTTP-Referer": "https://pavelo.ai", "X-Title": "Pavelo"},
        )
        self._default_model = default_model

    async def complete(
        self,
        messages: list[LLMMessage],
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        resp = await self._client.chat.completions.create(
            model=model or self._default_model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return LLMResponse(
            content=resp.choices[0].message.content or "",
            model=resp.model or "",
            usage=dict(resp.usage) if resp.usage else {},
        )

    async def stream(
        self,
        messages: list[LLMMessage],
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> AsyncIterator[str]:
        resp = await self._client.chat.completions.create(
            model=model or self._default_model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in resp:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def complete_with_tools(
        self,
        messages: list[LLMMessage],
        tools: list[dict],
        *,
        model: str | None = None,
        temperature: float = 0,
        tool_choice: dict | None = None,
    ) -> dict:
        kwargs: dict = {
            "model": model or self._default_model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "tools": tools,
            "temperature": temperature,
        }
        if tool_choice:
            kwargs["tool_choice"] = tool_choice

        resp = await self._client.chat.completions.create(**kwargs)
        msg = resp.choices[0].message

        if msg.tool_calls:
            return {
                "tool_calls": [
                    {"name": tc.function.name, "arguments": tc.function.arguments}
                    for tc in msg.tool_calls
                ],
                "content": msg.content,
            }
        return {"tool_calls": [], "content": msg.content or ""}


class OpenRouterSTT(STTProvider):
    """STT via OpenRouter's speech-to-text models."""

    def __init__(self, api_key: str, model: str = "openai/whisper-large-v3"):
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )
        self._model = model

    async def transcribe(self, audio_data: bytes, *, language: str = "en") -> STTResult:
        try:
            transcript = await self._client.audio.transcriptions.create(
                model=self._model,
                file=("audio.wav", audio_data, "audio/wav"),
                language=language,
            )
            return STTResult(text=transcript.text, language=language)
        except Exception as e:
            logger.error("openrouter_stt_error", error=str(e))
            return STTResult(text="", is_final=True, confidence=0.0)


class OpenRouterTTS(TTSProvider):
    """TTS via OpenRouter's text-to-speech models."""

    def __init__(self, api_key: str, model: str = "openai/tts-1", voice: str = "nova"):
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )
        self._model = model
        self._voice = voice

    async def synthesize(self, text: str, *, language: str = "en") -> TTSResult:
        try:
            response = await self._client.audio.speech.create(
                model=self._model,
                voice=self._voice,
                input=text,
            )
            audio_bytes = await response.aread()
            return TTSResult(audio_data=audio_bytes, sample_rate=24000, format="mp3")
        except Exception as e:
            logger.error("openrouter_tts_error", error=str(e))
            return TTSResult(audio_data=b"", sample_rate=24000)
