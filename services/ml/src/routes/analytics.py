"""
Search Analytics API Routes (S4-09)

GET /api/v1/analytics/search — Search analytics summary
POST /api/v1/analytics/search/log — Log a search event

Eval endpoint:
POST /api/v1/eval/search — Run search quality evaluation (S4-10)
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.search.analytics import (
    get_analytics_summary,
    log_search_event,
    clear_buffer,
)

logger = structlog.get_logger()
router = APIRouter(tags=["analytics"])


class LogSearchRequest(BaseModel):
    """Log a search event."""
    query: str
    filters: dict = {}
    result_count: int = 0
    duration_ms: int = 0
    source: str = "web"


@router.post("/api/v1/analytics/search/log")
async def log_search(request: LogSearchRequest):
    """Log a search event for analytics tracking."""
    log_search_event(
        query=request.query,
        filters=request.filters,
        result_count=request.result_count,
        duration_ms=request.duration_ms,
        source=request.source,
    )
    return {"logged": True}


@router.get("/api/v1/analytics/search")
async def get_search_analytics():
    """Get search analytics summary from in-memory buffer."""
    return get_analytics_summary()


@router.post("/api/v1/analytics/search/clear")
async def clear_analytics():
    """Clear the analytics event buffer."""
    count = clear_buffer()
    return {"cleared": count}


class EvalResponse(BaseModel):
    """Search quality evaluation response."""
    total_queries: int
    avg_mrr: float
    avg_ndcg_at_5: float
    avg_ndcg_at_10: float
    avg_precision_at_5: float
    avg_recall: float
    avg_latency_ms: float
    worst_queries: list[str] = []


@router.post("/api/v1/eval/search", response_model=EvalResponse)
async def run_eval():
    """Run the search quality evaluation benchmark (S4-10).

    Executes all benchmark queries and returns aggregate metrics.
    This endpoint may take 30-60 seconds to complete.
    """
    from src.eval.search_quality import run_evaluation

    summary = await run_evaluation()

    return EvalResponse(
        total_queries=summary.total_queries,
        avg_mrr=summary.avg_mrr,
        avg_ndcg_at_5=summary.avg_ndcg_at_5,
        avg_ndcg_at_10=summary.avg_ndcg_at_10,
        avg_precision_at_5=summary.avg_precision_at_5,
        avg_recall=summary.avg_recall,
        avg_latency_ms=summary.avg_latency_ms,
        worst_queries=summary.worst_queries,
    )
