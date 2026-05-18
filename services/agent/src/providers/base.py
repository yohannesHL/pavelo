"""
Abstract base classes for LLM, STT, and TTS providers.

Every concrete adapter implements one of these protocols.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator


@dataclass
class LLMMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


@dataclass
class LLMResponse:
    content: str
    model: str = ""
    usage: dict = field(default_factory=dict)


class LLMProvider(ABC):
    """Chat completion provider (OpenAI-compatible)."""

    @abstractmethod
    async def complete(
        self,
        messages: list[LLMMessage],
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        """Non-streaming completion."""

    @abstractmethod
    async def stream(
        self,
        messages: list[LLMMessage],
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> AsyncIterator[str]:
        """Yield response tokens as they arrive."""

    @abstractmethod
    async def complete_with_tools(
        self,
        messages: list[LLMMessage],
        tools: list[dict],
        *,
        model: str | None = None,
        temperature: float = 0,
        tool_choice: dict | None = None,
    ) -> dict:
        """Completion with function/tool calling. Returns raw tool call result."""


@dataclass
class STTResult:
    text: str
    is_final: bool = True
    confidence: float = 1.0
    language: str = "en"


class STTProvider(ABC):
    """Speech-to-text provider."""

    @abstractmethod
    async def transcribe(self, audio_data: bytes, *, language: str = "en") -> STTResult:
        """Transcribe audio bytes to text."""

    def create_pipecat_service(self, language: str = "en"):
        """Return a Pipecat-compatible service object, or None if not supported."""
        return None


@dataclass
class TTSResult:
    audio_data: bytes
    sample_rate: int = 24000
    format: str = "pcm"


class TTSProvider(ABC):
    """Text-to-speech provider."""

    @abstractmethod
    async def synthesize(self, text: str, *, language: str = "en") -> TTSResult:
        """Convert text to audio bytes."""

    def create_pipecat_service(self, language: str = "en"):
        """Return a Pipecat-compatible service object, or None if not supported."""
        return None
