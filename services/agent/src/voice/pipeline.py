"""
Pipecat Voice Pipeline (S6-03)

Composes the full voice pipeline:
  VAD → STT → LangGraph Agent → TTS

Uses the provider factory to resolve STT/TTS backends:
  Deepgram/Cartesia (if API keys set) → OpenRouter → Stub

Runs as a LiveKit agent — joins a room as a participant and
processes audio bidirectionally via WebRTC.

Pipeline design:
- VAD detects speech start/end
- STT streams interim + final transcripts
- Agent processes final transcripts through LangGraph
- TTS converts agent response to speech
- Barge-in: user speech during TTS cancels current TTS output
"""

from __future__ import annotations

import asyncio
import json
from typing import Optional

import structlog

logger = structlog.get_logger()


class VoicePipeline:
    """Pipecat-based voice pipeline for Xara.

    This class composes the pipeline components and manages the
    lifecycle of a voice session within a LiveKit room.

    Usage:
        pipeline = VoicePipeline(room_name="voice-abc-123", user_id="...")
        await pipeline.start()
        # ... runs until session ends
        await pipeline.stop()
    """

    def __init__(
        self,
        room_name: str,
        user_id: str,
        conversation_id: str,
        language: str = "en",
        session_id: Optional[str] = None,
    ):
        self.room_name = room_name
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.language = language
        self.session_id = session_id
        self._running = False
        self._pipeline_task: Optional[asyncio.Task] = None

        # Metrics
        self._interruption_count = 0
        self._tool_call_count = 0
        self._ttfb_ms: Optional[float] = None

    async def start(self) -> None:
        """Start the voice pipeline.

        Connects to the LiveKit room as the agent participant,
        sets up the audio processing pipeline, and begins processing.
        """
        from .config import voice_config

        logger.info(
            "voice_pipeline_starting",
            room=self.room_name,
            user_id=self.user_id,
            language=self.language,
        )

        self._running = True

        try:
            # Lazy import pipecat components — they're optional deps
            await self._run_pipeline(voice_config)
        except ImportError as e:
            logger.warning(
                "pipecat_not_available",
                error=str(e),
                message="Pipecat or its dependencies not installed. Running in stub mode.",
            )
            await self._run_stub_pipeline()
        except Exception as e:
            logger.error("voice_pipeline_error", error=str(e))
            raise

    async def _run_pipeline(self, config) -> None:
        """Run the full Pipecat pipeline with LiveKit transport."""
        try:
            from pipecat.pipeline.pipeline import Pipeline
            from pipecat.pipeline.runner import PipelineRunner
            from pipecat.pipeline.task import PipelineTask, PipelineParams
            from pipecat.transports.services.livekit import LiveKitTransport, LiveKitParams

            from .vad import create_vad_analyzer
            from .stt import create_stt_service
            from .tts import create_tts_service
            from .agent_processor import AgentProcessor

            # 1. LiveKit Transport
            transport = LiveKitTransport(
                url=config.livekit_url,
                api_key=config.livekit_api_key,
                api_secret=config.livekit_api_secret,
                room_name=self.room_name,
                participant_identity=config.agent_participant_identity,
                participant_name=config.agent_participant_name,
            )

            # 2. VAD
            vad = create_vad_analyzer(config)

            # 3. STT (Deepgram Nova-3)
            stt = create_stt_service(config, self.language)

            # 4. Agent processor (bridges STT → LangGraph → TTS)
            agent = AgentProcessor(
                user_id=self.user_id,
                conversation_id=self.conversation_id,
                language=self.language,
                on_interruption=self._handle_interruption,
                on_tool_call=self._handle_tool_call,
            )

            # 5. TTS (Cartesia Sonic)
            tts = create_tts_service(config, self.language)

            # 6. Compose pipeline
            pipeline = Pipeline([
                transport.input(),    # Audio from user
                vad,                  # Voice activity detection
                stt,                  # Speech-to-text
                agent,                # LangGraph processing
                tts,                  # Text-to-speech
                transport.output(),   # Audio to user
            ])

            params = PipelineParams(
                allow_interruptions=True,
                enable_metrics=True,
            )

            task = PipelineTask(pipeline, params=params)

            # 7. Run
            runner = PipelineRunner()
            self._pipeline_task = asyncio.create_task(runner.run(task))
            await self._pipeline_task

        except ImportError as e:
            raise ImportError(f"Pipecat dependency missing: {e}") from e

    async def _run_stub_pipeline(self) -> None:
        """Stub pipeline when Pipecat is not installed.

        Logs a warning and keeps the session alive without processing.
        Used for development/testing without full voice infrastructure.
        """
        logger.warning(
            "voice_pipeline_stub_mode",
            room=self.room_name,
            message="Running stub pipeline — no audio processing active",
        )

        while self._running:
            await asyncio.sleep(1)

    async def stop(self) -> None:
        """Stop the voice pipeline and clean up resources."""
        self._running = False

        if self._pipeline_task and not self._pipeline_task.done():
            self._pipeline_task.cancel()
            try:
                await self._pipeline_task
            except asyncio.CancelledError:
                pass

        logger.info(
            "voice_pipeline_stopped",
            room=self.room_name,
            interruptions=self._interruption_count,
            tool_calls=self._tool_call_count,
        )

    def _handle_interruption(self) -> None:
        """Called when user barges in during TTS playback."""
        self._interruption_count += 1
        logger.debug("voice_barge_in", count=self._interruption_count)

    def _handle_tool_call(self, tool_name: str) -> None:
        """Called when the agent executes a tool."""
        self._tool_call_count += 1
        logger.debug("voice_tool_call", tool=tool_name, count=self._tool_call_count)

    @property
    def metrics(self) -> dict:
        """Return current session metrics."""
        return {
            "interruption_count": self._interruption_count,
            "tool_call_count": self._tool_call_count,
            "ttfb_ms": self._ttfb_ms,
        }
