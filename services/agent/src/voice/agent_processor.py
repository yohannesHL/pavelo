"""
Agent Processor (S6-03)

Bridges STT output → LangGraph Agent → TTS input within the Pipecat pipeline.

Responsibilities:
- Receives transcribed text from STT
- Sends to LangGraph agent for processing
- Streams agent response text to TTS
- Handles barge-in interruptions
- Tracks tool calls and metrics
- Sends transcription events to client via LiveKit data channel
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Callable, Optional

import structlog

from src.config import settings

logger = structlog.get_logger()


class AgentProcessor:
    """Processes transcribed speech through the LangGraph agent.

    Sits between STT and TTS in the Pipecat pipeline. When a final
    transcript arrives, it:
    1. Sends transcription event to the client
    2. Invokes the LangGraph agent
    3. Streams the response to TTS
    4. Sends agent transcription to the client

    Supports barge-in: if on_interruption callback is set, it will be
    called when the user speaks during agent response generation.
    """

    def __init__(
        self,
        user_id: str,
        conversation_id: str,
        language: str = "en",
        on_interruption: Optional[Callable] = None,
        on_tool_call: Optional[Callable] = None,
    ):
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.language = language
        self.on_interruption = on_interruption
        self.on_tool_call = on_tool_call
        self._is_processing = False
        self._current_task: Optional[asyncio.Task] = None

    async def process_transcript(self, transcript: str, is_final: bool = True) -> Optional[str]:
        """Process a transcript through the LangGraph agent.

        Args:
            transcript: The transcribed text from STT.
            is_final: Whether this is a final transcript (vs interim).

        Returns:
            Agent response text for TTS, or None if interim/error.
        """
        if not is_final:
            # Interim results — don't process, just notify client
            return None

        if not transcript.strip():
            return None

        # Handle barge-in: cancel current processing
        if self._is_processing:
            if self.on_interruption:
                self.on_interruption()
            if self._current_task and not self._current_task.done():
                self._current_task.cancel()

        self._is_processing = True
        start_time = time.monotonic()

        try:
            response = await self._invoke_agent(transcript)

            # Track TTFB
            ttfb_ms = (time.monotonic() - start_time) * 1000
            logger.info(
                "agent_response_generated",
                ttfb_ms=round(ttfb_ms, 1),
                input_length=len(transcript),
                output_length=len(response) if response else 0,
            )

            return response

        except asyncio.CancelledError:
            logger.debug("agent_processing_cancelled", message="Barge-in interrupted processing")
            return None
        except Exception as e:
            logger.error("agent_processing_error", error=str(e))
            return "I'm sorry, I had trouble processing that. Could you repeat it?"
        finally:
            self._is_processing = False

    async def _invoke_agent(self, message: str) -> str:
        """Invoke the LangGraph agent with a text message.

        Uses the same agent infrastructure as text chat (S5-04),
        but with voice-optimized response formatting.
        """
        import httpx

        agent_url = settings.api_gateway_url or "http://localhost:8000"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{agent_url}/api/v1/chat",
                    json={
                        "user_id": self.user_id,
                        "conversation_id": self.conversation_id,
                        "message": message,
                        "stream": False,  # For voice, we want the complete response
                        "persona_name": "Xara",
                        "persona_tone": "professional",
                    },
                )

                if response.status_code != 200:
                    logger.error(
                        "agent_api_error",
                        status=response.status_code,
                        body=response.text[:200],
                    )
                    return "I'm having a moment — could you say that again?"

                data = response.json()
                return data.get("response", data.get("content", ""))

        except httpx.TimeoutException:
            logger.warning("agent_timeout")
            return "I need a moment to think about that. Let me get back to you."
        except Exception as e:
            logger.error("agent_invoke_error", error=str(e))
            return "I'm sorry, I'm having trouble connecting. Let me try again."

    def handle_interruption(self) -> None:
        """Handle barge-in: user speaks during TTS playback.

        Cancels current processing and TTS output so the pipeline
        can start processing the new user input immediately.
        """
        if self._is_processing and self._current_task:
            self._current_task.cancel()

        if self.on_interruption:
            self.on_interruption()

        logger.debug("barge_in_handled")
