"""
Search Analytics Module (S4-09)

Query logging, click-through tracking, and zero-results analysis.
The ML service logs search events for analysis; the API gateway
handles persistence to PostgreSQL via Prisma.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import structlog

logger = structlog.get_logger()


@dataclass
class SearchEventLog:
    """In-memory search event for analytics."""
    query: str
    filters: dict[str, Any] = field(default_factory=dict)
    result_count: int = 0
    duration_ms: int = 0
    source: str = "ml_service"
    timestamp: float = field(default_factory=time.time)


# In-memory buffer for search events (flushed to API periodically)
_event_buffer: list[SearchEventLog] = []
_MAX_BUFFER_SIZE = 1000


def log_search_event(
    query: str,
    filters: dict[str, Any] | None = None,
    result_count: int = 0,
    duration_ms: int = 0,
    source: str = "ml_service",
) -> None:
    """Log a search event for analytics.

    In production, this would write to a message queue or directly to the DB.
    For now, we log and buffer in-memory.
    """
    event = SearchEventLog(
        query=query,
        filters=filters or {},
        result_count=result_count,
        duration_ms=duration_ms,
        source=source,
    )

    _event_buffer.append(event)

    # Trim buffer if too large
    if len(_event_buffer) > _MAX_BUFFER_SIZE:
        _event_buffer.pop(0)

    logger.info(
        "search_event_logged",
        query=query[:100],
        result_count=result_count,
        duration_ms=duration_ms,
        source=source,
    )


def get_analytics_summary() -> dict[str, Any]:
    """Get summary analytics from the in-memory buffer.

    Returns:
        Analytics summary with top queries, avg results, zero-result rate.
    """
    if not _event_buffer:
        return {
            "total_searches": 0,
            "avg_results": 0,
            "avg_duration_ms": 0,
            "zero_result_count": 0,
            "zero_result_rate": 0,
            "top_queries": [],
            "buffer_size": 0,
        }

    total = len(_event_buffer)
    avg_results = sum(e.result_count for e in _event_buffer) / total
    avg_duration = sum(e.duration_ms for e in _event_buffer) / total
    zero_results = sum(1 for e in _event_buffer if e.result_count == 0)

    # Top queries
    query_freq: dict[str, int] = {}
    for e in _event_buffer:
        q = e.query.lower().strip()
        query_freq[q] = query_freq.get(q, 0) + 1

    top_queries = sorted(query_freq.items(), key=lambda x: x[1], reverse=True)[:20]

    # Zero-result queries
    zero_queries: dict[str, int] = {}
    for e in _event_buffer:
        if e.result_count == 0:
            q = e.query.lower().strip()
            zero_queries[q] = zero_queries.get(q, 0) + 1

    top_zero_queries = sorted(zero_queries.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "total_searches": total,
        "avg_results": round(avg_results, 1),
        "avg_duration_ms": round(avg_duration, 0),
        "zero_result_count": zero_results,
        "zero_result_rate": round(zero_results / total, 3) if total > 0 else 0,
        "top_queries": [{"query": q, "count": c} for q, c in top_queries],
        "top_zero_result_queries": [{"query": q, "count": c} for q, c in top_zero_queries],
        "buffer_size": total,
    }


def clear_buffer() -> int:
    """Clear the analytics buffer. Returns count of cleared events."""
    count = len(_event_buffer)
    _event_buffer.clear()
    return count
