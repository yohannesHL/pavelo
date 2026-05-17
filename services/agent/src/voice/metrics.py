"""
Voice Quality Monitoring (S6-10)

Tracks voice pipeline performance metrics:
- TTFB (Time to First Byte) for voice responses
- WER (Word Error Rate) tracking placeholder
- Session metadata logging
- Recording consent management

Metrics are stored in VoiceSession.metadata JSON field
and exposed via the tRPC voice.getMetrics endpoint.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Optional

import structlog

logger = structlog.get_logger()


@dataclass
class SessionMetrics:
    """Tracks metrics for a single voice session."""

    session_id: str
    start_time: float = field(default_factory=time.monotonic)

    # TTFB tracking
    ttfb_values: list[float] = field(default_factory=list)

    # Interaction counts
    interruption_count: int = 0
    tool_call_count: int = 0
    turn_count: int = 0

    # Language
    detected_languages: list[str] = field(default_factory=list)
    primary_language: str = "en"

    # Transcript logging (for WER analysis — text only, no audio)
    transcripts: list[dict] = field(default_factory=list)

    # Session flags
    recording_consent: bool = False

    def record_ttfb(self, ttfb_ms: float) -> None:
        """Record a TTFB measurement (milliseconds)."""
        self.ttfb_values.append(ttfb_ms)
        logger.debug("ttfb_recorded", ttfb_ms=round(ttfb_ms, 1), session=self.session_id)

    def record_interruption(self) -> None:
        """Record a barge-in interruption."""
        self.interruption_count += 1

    def record_tool_call(self, tool_name: str) -> None:
        """Record a tool call."""
        self.tool_call_count += 1
        logger.debug("tool_call_recorded", tool=tool_name, session=self.session_id)

    def record_turn(self, speaker: str, text: str) -> None:
        """Record a conversation turn for WER analysis.

        Only stores text — no audio is recorded.
        """
        self.turn_count += 1
        self.transcripts.append({
            "speaker": speaker,
            "text": text,
            "timestamp": time.time(),
            "turn": self.turn_count,
        })

    def record_language(self, language: str) -> None:
        """Record a detected language."""
        if language not in self.detected_languages:
            self.detected_languages.append(language)
            logger.info("language_detected", language=language, session=self.session_id)

    @property
    def avg_ttfb_ms(self) -> Optional[float]:
        """Average TTFB in milliseconds."""
        if not self.ttfb_values:
            return None
        return sum(self.ttfb_values) / len(self.ttfb_values)

    @property
    def min_ttfb_ms(self) -> Optional[float]:
        """Minimum TTFB in milliseconds."""
        return min(self.ttfb_values) if self.ttfb_values else None

    @property
    def max_ttfb_ms(self) -> Optional[float]:
        """Maximum TTFB in milliseconds."""
        return max(self.ttfb_values) if self.ttfb_values else None

    @property
    def duration_secs(self) -> float:
        """Session duration in seconds."""
        return time.monotonic() - self.start_time

    def to_metadata(self) -> dict:
        """Export metrics as a metadata dict for DB storage.

        This is saved to VoiceSession.metadata via the API.
        """
        return {
            "ttfbMs": round(self.avg_ttfb_ms, 1) if self.avg_ttfb_ms else None,
            "ttfbMinMs": round(self.min_ttfb_ms, 1) if self.min_ttfb_ms else None,
            "ttfbMaxMs": round(self.max_ttfb_ms, 1) if self.max_ttfb_ms else None,
            "ttfbCount": len(self.ttfb_values),
            "turnCount": self.turn_count,
            "detectedLanguages": self.detected_languages,
            "primaryLanguage": self.primary_language,
            "recordingConsent": self.recording_consent,
            "transcriptCount": len(self.transcripts),
        }

    def summary(self) -> str:
        """Human-readable summary for logging."""
        ttfb_str = (f"avg_ttfb={self.avg_ttfb_ms:.0f}ms" if self.avg_ttfb_ms is not None else "no TTFB")
        return (
            f"Session {self.session_id}: "
            f"duration={self.duration_secs:.0f}s, "
            f"turns={self.turn_count}, "
            f"interruptions={self.interruption_count}, "
            f"tools={self.tool_call_count}, "
            f"{ttfb_str}"
        )


class MetricsCollector:
    """Collects metrics across all active voice sessions.

    Provides aggregate metrics for the monitoring dashboard.
    """

    def __init__(self):
        self._sessions: dict[str, SessionMetrics] = {}

    def create_session(self, session_id: str, recording_consent: bool = False) -> SessionMetrics:
        """Create and register a new session metrics tracker."""
        metrics = SessionMetrics(
            session_id=session_id,
            recording_consent=recording_consent,
        )
        self._sessions[session_id] = metrics
        return metrics

    def get_session(self, session_id: str) -> Optional[SessionMetrics]:
        """Get metrics for a specific session."""
        return self._sessions.get(session_id)

    def end_session(self, session_id: str) -> Optional[dict]:
        """End tracking and return final metadata."""
        metrics = self._sessions.pop(session_id, None)
        if metrics:
            metadata = metrics.to_metadata()
            logger.info(
                "session_metrics_final",
                session_id=session_id,
                duration_secs=round(metrics.duration_secs),
                turns=metrics.turn_count,
                avg_ttfb=metrics.avg_ttfb_ms,
            )
            return metadata
        return None

    @property
    def active_count(self) -> int:
        """Number of currently active sessions."""
        return len(self._sessions)

    def aggregate_metrics(self) -> dict:
        """Aggregate metrics across all active sessions."""
        all_ttfb = []
        total_turns = 0
        total_interruptions = 0

        for m in self._sessions.values():
            all_ttfb.extend(m.ttfb_values)
            total_turns += m.turn_count
            total_interruptions += m.interruption_count

        return {
            "active_sessions": self.active_count,
            "total_turns": total_turns,
            "total_interruptions": total_interruptions,
            "avg_ttfb_ms": round(sum(all_ttfb) / len(all_ttfb), 1) if all_ttfb else None,
        }


# Singleton instance
metrics_collector = MetricsCollector()
