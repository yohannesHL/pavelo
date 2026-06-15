"""
OpenAI direct adapter — uses the OpenAI API directly.

Used when OPENAI_API_KEY is set and OpenRouter is not configured.
"""

from __future__ import annotations

from typing import AsyncIterator

import structlog
from openai import AsyncOpenAI

from .base import LLMProvider, LLMMessage, LLMResponse

logger = structlog.get_logger()


class OpenAILLM(LLMProvider):
    """LLM completions via the OpenAI API."""

    def __init__(self, api_key: str, default_model: str = "gpt-4o-mini"):
        self._client = AsyncOpenAI(api_key=api_key)
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
