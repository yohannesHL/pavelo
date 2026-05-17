"""
Voice Transcript Service (S6-06)

Saves voice transcripts as conversation messages.
Integrates with the same Conversation/Message models from Sprint 5.

Features:
- Save user speech as messages with source="voice"
- Save agent responses with source="voice"
- Unified timeline with text chat messages
- Async non-blocking saves via API gateway
"""

from __future__ import annotations

import asyncio
from typing import Optional

import httpx
import structlog

from src.config import settings

logger = structlog.get_logger()


class TranscriptService:
    """Saves voice transcripts to the conversation API.

    Sends transcript messages to the API gateway which persists
    them using the same Prisma Message model as text chat.
    Messages are tagged with source="voice" for identification.
    """

    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url or settings.api_gateway_url or "http://localhost:4000"

    async def save_user_message(
        self,
        conversation_id: str,
        content: str,
        auth_token: Optional[str] = None,
    ) -> Optional[str]:
        """Save a user's voice transcript as a message.

        Args:
            conversation_id: The conversation to add the message to.
            content: The transcribed text.
            auth_token: Optional auth token for authenticated saves.

        Returns:
            Message ID if saved, None on failure.
        """
        return await self._save_message(
            conversation_id=conversation_id,
            role="user",
            content=content,
            source="voice",
            auth_token=auth_token,
        )

    async def save_agent_message(
        self,
        conversation_id: str,
        content: str,
        auth_token: Optional[str] = None,
    ) -> Optional[str]:
        """Save an agent's voice response as a message.

        Args:
            conversation_id: The conversation to add the message to.
            content: The agent's response text (same text sent to TTS).
            auth_token: Optional auth token for authenticated saves.

        Returns:
            Message ID if saved, None on failure.
        """
        return await self._save_message(
            conversation_id=conversation_id,
            role="assistant",
            content=content,
            source="voice",
            auth_token=auth_token,
        )

    async def _save_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        source: str = "voice",
        auth_token: Optional[str] = None,
    ) -> Optional[str]:
        """Save a message to the conversation via tRPC API.

        Uses the conversation.addMessage endpoint.
        Non-blocking — errors are logged but don't crash the pipeline.
        """
        if not content.strip():
            return None

        try:
            headers = {"Content-Type": "application/json"}
            if auth_token:
                headers["Authorization"] = f"Bearer {auth_token}"

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.api_url}/trpc/conversation.addMessage",
                    json={
                        "conversationId": conversation_id,
                        "role": role,
                        "content": content,
                        "source": source,
                    },
                    headers=headers,
                )

                if response.status_code == 200:
                    data = response.json()
                    msg_id = data.get("result", {}).get("data", {}).get("id")
                    logger.debug(
                        "transcript_saved",
                        conversation_id=conversation_id,
                        role=role,
                        source=source,
                        message_id=msg_id,
                    )
                    return msg_id
                else:
                    logger.warning(
                        "transcript_save_failed",
                        status=response.status_code,
                        body=response.text[:200],
                    )
                    return None

        except Exception as e:
            logger.error(
                "transcript_save_error",
                error=str(e),
                conversation_id=conversation_id,
            )
            return None


# Singleton instance
transcript_service = TranscriptService()
