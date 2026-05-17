"""
Voice Latency Tracking (S10-03)

Enhanced latency tracking for the voice pipeline with
per-stage timing: STT → Agent → TTS.

Targets: < 800ms end-to-end latency.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Optional

import structlog

logger = structlog.get_logger()


@dataclass
class LatencyBreakdown:
    """Timing breakdown for a single voice turn."""

    turn_id: int
    stt_start: float = 0.0
    stt_end: float = 0.0
    agent_start: float = 0.0
    agent_end: float = 0.0
    tts_start: float = 0.0
    tts_first_byte: float = 0.0
    tts_end: float = 0.0

    @property
    def stt_ms(self) -> float:
        """STT processing time in milliseconds."""
        if self.stt_start and self.stt_end:
            return (self.stt_end - self.stt_start) * 1000
        return 0.0

    @property
    def agent_ms(self) -> float:
        """Agent processing time in milliseconds."""
        if self.agent_start and self.agent_end:
            return (self.agent_end - self.agent_start) * 1000
        return 0.0

    @property
    def tts_ms(self) -> float:
        """TTS time to first byte in milliseconds."""
        if self.tts_start and self.tts_first_byte:
            return (self.tts_first_byte - self.tts_start) * 1000
        return 0.0

    @property
    def total_ms(self) -> float:
        """Total end-to-end latency from STT complete to TTS first byte."""
        if self.stt_end and self.tts_first_byte:
            return (self.tts_first_byte - self.stt_end) * 1000
        return 0.0

    @property
    def e2e_ms(self) -> float:
        """Full end-to-end from speech detected to audio playing."""
        if self.stt_start and self.tts_first_byte:
            return (self.tts_first_byte - self.stt_start) * 1000
        return 0.0

    def to_dict(self) -> dict:
        return {
            "turn": self.turn_id,
            "stt_ms": round(self.stt_ms, 1),
            "agent_ms": round(self.agent_ms, 1),
            "tts_ms": round(self.tts_ms, 1),
            "total_ms": round(self.total_ms, 1),
            "e2e_ms": round(self.e2e_ms, 1),
        }


class LatencyTracker:
    """Tracks per-turn latency breakdown across the voice pipeline.

    Usage:
        tracker = LatencyTracker(session_id="abc")
        tracker.mark_stt_start()
        tracker.mark_stt_end()
        tracker.mark_agent_start()
        tracker.mark_agent_end()
        tracker.mark_tts_start()
        tracker.mark_tts_first_byte()

        # Get current turn's breakdown
        breakdown = tracker.current_turn()

        # Get aggregate metrics
        metrics = tracker.get_metrics()
    """

    def __init__(self, session_id: str):
        self.session_id = session_id
        self._turns: list[LatencyBreakdown] = []
        self._current: Optional[LatencyBreakdown] = None
        self._turn_counter = 0

    def _ensure_current(self) -> LatencyBreakdown:
        if self._current is None:
            self._turn_counter += 1
            self._current = LatencyBreakdown(turn_id=self._turn_counter)
        return self._current

    def mark_stt_start(self) -> None:
        turn = self._ensure_current()
        turn.stt_start = time.monotonic()

    def mark_stt_end(self) -> None:
        turn = self._ensure_current()
        turn.stt_end = time.monotonic()
        logger.debug(
            "latency_stt",
            session=self.session_id,
            stt_ms=round(turn.stt_ms, 1),
        )

    def mark_agent_start(self) -> None:
        turn = self._ensure_current()
        turn.agent_start = time.monotonic()

    def mark_agent_end(self) -> None:
        turn = self._ensure_current()
        turn.agent_end = time.monotonic()
        logger.debug(
            "latency_agent",
            session=self.session_id,
            agent_ms=round(turn.agent_ms, 1),
        )

    def mark_tts_start(self) -> None:
        turn = self._ensure_current()
        turn.tts_start = time.monotonic()

    def mark_tts_first_byte(self) -> None:
        turn = self._ensure_current()
        turn.tts_first_byte = time.monotonic()
        logger.debug(
            "latency_tts_first_byte",
            session=self.session_id,
            tts_ms=round(turn.tts_ms, 1),
            e2e_ms=round(turn.e2e_ms, 1),
        )

    def mark_tts_end(self) -> None:
        turn = self._ensure_current()
        turn.tts_end = time.monotonic()

    def complete_turn(self) -> Optional[LatencyBreakdown]:
        """Finalize current turn and start tracking the next one."""
        if self._current is None:
            return None

        breakdown = self._current
        self._turns.append(breakdown)
        self._current = None

        if breakdown.e2e_ms > 800:
            logger.warning(
                "latency_above_target",
                session=self.session_id,
                turn=breakdown.turn_id,
                e2e_ms=round(breakdown.e2e_ms, 1),
                target_ms=800,
            )

        return breakdown

    def current_turn(self) -> Optional[LatencyBreakdown]:
        return self._current

    def get_metrics(self) -> dict:
        """Aggregate latency metrics across all completed turns."""
        if not self._turns:
            return {
                "session_id": self.session_id,
                "turn_count": 0,
                "avg_e2e_ms": None,
                "p50_e2e_ms": None,
                "p95_e2e_ms": None,
                "avg_stt_ms": None,
                "avg_agent_ms": None,
                "avg_tts_ms": None,
                "under_target": None,
            }

        e2e_values = sorted([t.e2e_ms for t in self._turns if t.e2e_ms > 0])
        stt_values = [t.stt_ms for t in self._turns if t.stt_ms > 0]
        agent_values = [t.agent_ms for t in self._turns if t.agent_ms > 0]
        tts_values = [t.tts_ms for t in self._turns if t.tts_ms > 0]

        def _avg(values: list[float]) -> Optional[float]:
            return round(sum(values) / len(values), 1) if values else None

        def _percentile(values: list[float], pct: float) -> Optional[float]:
            if not values:
                return None
            idx = int(len(values) * pct / 100)
            idx = min(idx, len(values) - 1)
            return round(values[idx], 1)

        under_target = sum(1 for v in e2e_values if v < 800)

        return {
            "session_id": self.session_id,
            "turn_count": len(self._turns),
            "avg_e2e_ms": _avg(e2e_values),
            "p50_e2e_ms": _percentile(e2e_values, 50),
            "p95_e2e_ms": _percentile(e2e_values, 95),
            "avg_stt_ms": _avg(stt_values),
            "avg_agent_ms": _avg(agent_values),
            "avg_tts_ms": _avg(tts_values),
            "under_target": (
                f"{under_target}/{len(e2e_values)}"
                if e2e_values
                else None
            ),
            "turns": [t.to_dict() for t in self._turns[-20:]],
        }
