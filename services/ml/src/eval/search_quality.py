"""
Search Quality Evaluation (S4-10)

Retrieval benchmark with MRR (Mean Reciprocal Rank) and
NDCG (Normalised Discounted Cumulative Gain) metrics.

Usage:
    python -m src.eval.search_quality

Benchmark dataset: 25 query-result pairs covering:
- Simple structured queries (bedrooms, price)
- Natural language queries
- Location-specific queries
- Style/era queries
- Feature-based queries
"""

from __future__ import annotations

import asyncio
import math
import time
from dataclasses import dataclass, field
from typing import Any

import structlog

logger = structlog.get_logger()


@dataclass
class QueryBenchmark:
    """A single benchmark query with expected relevant results."""
    query: str
    relevant_ids: list[str]  # Property IDs that are relevant (ordered by relevance)
    description: str = ""
    category: str = "general"


@dataclass
class EvalResult:
    """Result of evaluating a single query."""
    query: str
    mrr: float  # Mean Reciprocal Rank
    ndcg_at_5: float  # NDCG@5
    ndcg_at_10: float  # NDCG@10
    precision_at_5: float  # Precision@5
    recall: float
    retrieved_ids: list[str] = field(default_factory=list)
    relevant_found: int = 0
    total_relevant: int = 0
    latency_ms: float = 0.0


@dataclass
class EvalSummary:
    """Summary of evaluation across all benchmark queries."""
    total_queries: int
    avg_mrr: float
    avg_ndcg_at_5: float
    avg_ndcg_at_10: float
    avg_precision_at_5: float
    avg_recall: float
    avg_latency_ms: float
    results: list[EvalResult] = field(default_factory=list)
    worst_queries: list[str] = field(default_factory=list)


# --- Benchmark Dataset ---
# In production, this would be loaded from a JSON file or database.
# These are example queries with placeholder IDs. Replace with real
# property IDs from your Qdrant index for actual evaluation.

BENCHMARK_QUERIES: list[QueryBenchmark] = [
    QueryBenchmark(
        query="3 bedroom Victorian terrace in Islington",
        relevant_ids=["1"],  # Victorian Terrace in Islington
        category="structured",
        description="Specific structured query with beds, style, location",
    ),
    QueryBenchmark(
        query="modern flat with balcony and city views",
        relevant_ids=["2"],
        category="natural_language",
        description="NL query for modern flat",
    ),
    QueryBenchmark(
        query="family home with large garden in Oxford",
        relevant_ids=["3"],
        category="features",
        description="Feature-based query",
    ),
    QueryBenchmark(
        query="cottage in the Cotswolds with fireplace",
        relevant_ids=["4"],
        category="location_style",
        description="Location + style + feature query",
    ),
    QueryBenchmark(
        query="period property with bay windows",
        relevant_ids=["5"],
        category="style",
        description="Architectural style query",
    ),
    QueryBenchmark(
        query="luxury property with swimming pool under 3 million",
        relevant_ids=["6"],
        category="price_features",
        description="Price + luxury features",
    ),
    QueryBenchmark(
        query="2 bed flat under 500k",
        relevant_ids=[],  # May not match our mock data
        category="structured",
        description="Structured budget query",
    ),
    QueryBenchmark(
        query="semi-detached house in Bristol",
        relevant_ids=["5"],
        category="location",
        description="Location-specific query",
    ),
    QueryBenchmark(
        query="house with garden and parking near schools",
        relevant_ids=["3"],
        category="features",
        description="Multi-feature query",
    ),
    QueryBenchmark(
        query="property in Bath",
        relevant_ids=["6"],
        category="location",
        description="Simple location query",
    ),
    QueryBenchmark(
        query="terraced house with period features and open plan kitchen",
        relevant_ids=["1"],
        category="features",
        description="Multiple feature query",
    ),
    QueryBenchmark(
        query="penthouse with concierge in London",
        relevant_ids=["2"],
        category="type_location",
        description="Type + amenity + location",
    ),
    QueryBenchmark(
        query="detached house with en-suite over 600k",
        relevant_ids=["3"],
        category="price_features",
        description="Price + feature query",
    ),
    QueryBenchmark(
        query="Victorian home with garden in London under 1 million",
        relevant_ids=["1"],
        category="style_price_location",
        description="Complex multi-constraint query",
    ),
    QueryBenchmark(
        query="bungalow with south facing garden",
        relevant_ids=["3"],
        category="type_features",
        description="Type + orientation query",
    ),
    QueryBenchmark(
        query="large house with 5 or more bedrooms",
        relevant_ids=["6"],
        category="structured",
        description="Bedroom count query",
    ),
    QueryBenchmark(
        query="Edwardian property",
        relevant_ids=["5"],
        category="era",
        description="Era-specific query",
    ),
    QueryBenchmark(
        query="cheap property for first time buyer",
        relevant_ids=["4"],
        category="budget",
        description="Budget intent query",
    ),
    QueryBenchmark(
        query="investment property in London",
        relevant_ids=["1", "2"],
        category="intent",
        description="Investment intent query",
    ),
    QueryBenchmark(
        query="family home near good transport links",
        relevant_ids=["1", "2", "3"],
        category="lifestyle",
        description="Lifestyle-based query",
    ),
    QueryBenchmark(
        query="country house with stables and land",
        relevant_ids=["6"],
        category="rural",
        description="Rural property query",
    ),
    QueryBenchmark(
        query="modern apartment gym concierge",
        relevant_ids=["2"],
        category="amenities",
        description="Amenity-focused query",
    ),
    QueryBenchmark(
        query="house for sale in OX2",
        relevant_ids=["3"],
        category="postcode",
        description="Postcode-based query",
    ),
    QueryBenchmark(
        query="4 bed house with double garage",
        relevant_ids=["3"],
        category="structured",
        description="Structured with specific feature",
    ),
    QueryBenchmark(
        query="period cottage under 500k",
        relevant_ids=["4"],
        category="style_price",
        description="Style + price constraint",
    ),
]


# --- Metrics ---

def reciprocal_rank(retrieved_ids: list[str], relevant_ids: list[str]) -> float:
    """Calculate reciprocal rank (RR).

    RR = 1 / rank of the first relevant result.
    """
    for i, rid in enumerate(retrieved_ids, start=1):
        if rid in relevant_ids:
            return 1.0 / i
    return 0.0


def ndcg_at_k(retrieved_ids: list[str], relevant_ids: list[str], k: int) -> float:
    """Calculate NDCG@k (Normalised Discounted Cumulative Gain).

    Uses binary relevance: 1 if relevant, 0 if not.
    """
    if not relevant_ids:
        return 1.0  # No relevant docs = perfect score (nothing to find)

    # DCG
    dcg = 0.0
    for i, rid in enumerate(retrieved_ids[:k], start=1):
        if rid in relevant_ids:
            dcg += 1.0 / math.log2(i + 1)

    # Ideal DCG
    idcg = sum(1.0 / math.log2(i + 1) for i in range(1, min(len(relevant_ids), k) + 1))

    if idcg == 0:
        return 0.0

    return dcg / idcg


def precision_at_k(retrieved_ids: list[str], relevant_ids: list[str], k: int) -> float:
    """Calculate Precision@k."""
    if k == 0:
        return 0.0
    relevant_in_top_k = sum(1 for rid in retrieved_ids[:k] if rid in relevant_ids)
    return relevant_in_top_k / k


def recall(retrieved_ids: list[str], relevant_ids: list[str]) -> float:
    """Calculate recall."""
    if not relevant_ids:
        return 1.0
    found = sum(1 for rid in retrieved_ids if rid in relevant_ids)
    return found / len(relevant_ids)


# --- Evaluation Runner ---

async def evaluate_query(
    benchmark: QueryBenchmark,
    search_fn=None,
) -> EvalResult:
    """Evaluate a single benchmark query.

    Args:
        benchmark: Query with expected results.
        search_fn: Async search function. If None, uses hybrid_search.

    Returns:
        EvalResult with metrics.
    """
    from src.search.hybrid import hybrid_search

    if search_fn is None:
        search_fn = hybrid_search

    start = time.time()

    try:
        response = await search_fn(query=benchmark.query, top_k=20)
        retrieved_ids = [r.id for r in response.results]
    except Exception as e:
        logger.error("eval_query_error", query=benchmark.query, error=str(e))
        retrieved_ids = []

    latency = (time.time() - start) * 1000

    relevant_ids = benchmark.relevant_ids

    return EvalResult(
        query=benchmark.query,
        mrr=reciprocal_rank(retrieved_ids, relevant_ids),
        ndcg_at_5=ndcg_at_k(retrieved_ids, relevant_ids, 5),
        ndcg_at_10=ndcg_at_k(retrieved_ids, relevant_ids, 10),
        precision_at_5=precision_at_k(retrieved_ids, relevant_ids, 5),
        recall=recall(retrieved_ids, relevant_ids),
        retrieved_ids=retrieved_ids[:10],
        relevant_found=sum(1 for r in retrieved_ids if r in relevant_ids),
        total_relevant=len(relevant_ids),
        latency_ms=latency,
    )


async def run_evaluation(
    benchmarks: list[QueryBenchmark] | None = None,
    search_fn=None,
) -> EvalSummary:
    """Run the full evaluation benchmark.

    Args:
        benchmarks: List of benchmark queries. Uses BENCHMARK_QUERIES if None.
        search_fn: Optional custom search function.

    Returns:
        EvalSummary with aggregate metrics.
    """
    if benchmarks is None:
        benchmarks = BENCHMARK_QUERIES

    logger.info("eval_starting", num_queries=len(benchmarks))

    results = []
    for bm in benchmarks:
        result = await evaluate_query(bm, search_fn=search_fn)
        results.append(result)
        logger.info(
            "eval_query_result",
            query=bm.query[:60],
            mrr=round(result.mrr, 3),
            ndcg5=round(result.ndcg_at_5, 3),
            latency_ms=round(result.latency_ms, 0),
        )

    # Aggregate
    n = len(results)
    avg_mrr = sum(r.mrr for r in results) / n if n > 0 else 0
    avg_ndcg5 = sum(r.ndcg_at_5 for r in results) / n if n > 0 else 0
    avg_ndcg10 = sum(r.ndcg_at_10 for r in results) / n if n > 0 else 0
    avg_p5 = sum(r.precision_at_5 for r in results) / n if n > 0 else 0
    avg_recall = sum(r.recall for r in results) / n if n > 0 else 0
    avg_latency = sum(r.latency_ms for r in results) / n if n > 0 else 0

    # Find worst queries
    worst = sorted(results, key=lambda r: r.mrr)[:5]
    worst_queries = [f"{r.query} (MRR={r.mrr:.3f})" for r in worst]

    summary = EvalSummary(
        total_queries=n,
        avg_mrr=round(avg_mrr, 4),
        avg_ndcg_at_5=round(avg_ndcg5, 4),
        avg_ndcg_at_10=round(avg_ndcg10, 4),
        avg_precision_at_5=round(avg_p5, 4),
        avg_recall=round(avg_recall, 4),
        avg_latency_ms=round(avg_latency, 1),
        results=results,
        worst_queries=worst_queries,
    )

    logger.info(
        "eval_complete",
        total_queries=n,
        avg_mrr=summary.avg_mrr,
        avg_ndcg_at_5=summary.avg_ndcg_at_5,
        avg_ndcg_at_10=summary.avg_ndcg_at_10,
        avg_precision_at_5=summary.avg_precision_at_5,
        avg_recall=summary.avg_recall,
        avg_latency_ms=summary.avg_latency_ms,
    )

    return summary


# --- CLI Entry Point ---

def main():
    """Run search quality evaluation from command line."""
    print("=" * 60)
    print("  Pavelo Search Quality Evaluation (S4-10)")
    print("=" * 60)
    print()

    try:
        summary = asyncio.run(run_evaluation())
    except Exception as e:
        print(f"\n❌ Evaluation failed: {e}")
        print("   Make sure Qdrant is running and the ML service is configured.")
        print("   You can run: docker-compose up qdrant")
        return

    print(f"\n📊 Results ({summary.total_queries} queries)")
    print("-" * 40)
    print(f"  MRR:              {summary.avg_mrr:.4f}")
    print(f"  NDCG@5:           {summary.avg_ndcg_at_5:.4f}")
    print(f"  NDCG@10:          {summary.avg_ndcg_at_10:.4f}")
    print(f"  Precision@5:      {summary.avg_precision_at_5:.4f}")
    print(f"  Recall:           {summary.avg_recall:.4f}")
    print(f"  Avg Latency:      {summary.avg_latency_ms:.0f}ms")
    print()

    if summary.worst_queries:
        print("⚠️  Worst performing queries:")
        for q in summary.worst_queries:
            print(f"   • {q}")
        print()

    # Print per-category breakdown
    categories: dict[str, list[EvalResult]] = {}
    for i, bm in enumerate(BENCHMARK_QUERIES):
        if i < len(summary.results):
            cat = bm.category
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(summary.results[i])

    if categories:
        print("📋 Per-category MRR:")
        for cat, results in sorted(categories.items()):
            cat_mrr = sum(r.mrr for r in results) / len(results)
            print(f"   {cat:20s}  MRR={cat_mrr:.3f}  (n={len(results)})")

    print()
    print("✅ Evaluation complete")


if __name__ == "__main__":
    main()
