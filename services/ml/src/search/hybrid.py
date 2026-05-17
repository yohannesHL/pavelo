"""
Hybrid Search Engine (S4-01)

Dense + sparse fusion search with Reciprocal Rank Fusion (RRF) scoring.

Architecture:
  1. Query text → OpenAI text-embedding-3-large → dense vector
  2. Query text → BM25 tokeniser → sparse vector
  3. Qdrant parallel search: dense + sparse
  4. Filter post-processing: price, bedrooms, type, location, status
  5. RRF fusion: combine rankings from both result sets
  6. Return top-N results with scores
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

import structlog
from qdrant_client import QdrantClient
from qdrant_client.models import (
    FieldCondition,
    Filter,
    MatchValue,
    NamedSparseVector,
    NamedVector,
    Range,
    SearchRequest,
    SparseVector,
    ScoredPoint,
)

from src.config import settings
from src.pipelines.hybrid_search import generate_sparse_vector, get_qdrant_client
from src.pipelines.property_embed import generate_embedding

logger = structlog.get_logger()


@dataclass
class SearchFilters:
    """Structured filters for property search."""
    min_price: int | None = None
    max_price: int | None = None
    min_bedrooms: int | None = None
    max_bedrooms: int | None = None
    property_type: str | None = None
    city: str | None = None
    postcode: str | None = None
    status: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float | None = None


@dataclass
class SearchResult:
    """A single search result with fused score."""
    id: str
    score: float
    dense_rank: int | None = None
    sparse_rank: int | None = None
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class HybridSearchResponse:
    """Response from hybrid search."""
    results: list[SearchResult]
    total_dense: int = 0
    total_sparse: int = 0
    query: str = ""
    filters_applied: dict[str, Any] = field(default_factory=dict)


def _build_qdrant_filter(filters: SearchFilters) -> Filter | None:
    """Build a Qdrant filter from structured search filters.

    Uses Qdrant's server-side filtering for indexed payload fields.
    """
    conditions = []

    if filters.min_price is not None or filters.max_price is not None:
        range_params: dict[str, Any] = {}
        if filters.min_price is not None:
            range_params["gte"] = filters.min_price
        if filters.max_price is not None:
            range_params["lte"] = filters.max_price
        conditions.append(FieldCondition(key="price", range=Range(**range_params)))

    if filters.min_bedrooms is not None or filters.max_bedrooms is not None:
        range_params = {}
        if filters.min_bedrooms is not None:
            range_params["gte"] = filters.min_bedrooms
        if filters.max_bedrooms is not None:
            range_params["lte"] = filters.max_bedrooms
        conditions.append(FieldCondition(key="bedrooms", range=Range(**range_params)))

    if filters.property_type:
        conditions.append(
            FieldCondition(key="propertyType", match=MatchValue(value=filters.property_type))
        )

    if filters.city:
        conditions.append(
            FieldCondition(key="city", match=MatchValue(value=filters.city))
        )

    if filters.postcode:
        conditions.append(
            FieldCondition(key="postcode", match=MatchValue(value=filters.postcode))
        )

    if filters.status:
        conditions.append(
            FieldCondition(key="status", match=MatchValue(value=filters.status))
        )

    if not conditions:
        return None

    return Filter(must=conditions)


def _reciprocal_rank_fusion(
    dense_results: list[ScoredPoint],
    sparse_results: list[ScoredPoint],
    dense_weight: float = 0.6,
    sparse_weight: float = 0.4,
    k: int = 60,
) -> list[SearchResult]:
    """Combine dense and sparse search results using Reciprocal Rank Fusion.

    RRF score = Σ weight / (k + rank)

    This gives a normalised score that doesn't depend on the raw similarity
    values, making it safe to combine heterogeneous scoring systems.

    Args:
        dense_results: Results from dense (semantic) search.
        sparse_results: Results from sparse (BM25) search.
        dense_weight: Weight for dense results (default 0.6).
        sparse_weight: Weight for sparse results (default 0.4).
        k: RRF smoothing constant (default 60, standard).

    Returns:
        Fused and sorted SearchResult list.
    """
    scores: dict[str, SearchResult] = {}

    for rank, point in enumerate(dense_results, start=1):
        point_id = str(point.id)
        rrf_score = dense_weight / (k + rank)
        if point_id not in scores:
            scores[point_id] = SearchResult(
                id=point_id,
                score=0.0,
                payload=point.payload or {},
            )
        scores[point_id].score += rrf_score
        scores[point_id].dense_rank = rank

    for rank, point in enumerate(sparse_results, start=1):
        point_id = str(point.id)
        rrf_score = sparse_weight / (k + rank)
        if point_id not in scores:
            scores[point_id] = SearchResult(
                id=point_id,
                score=0.0,
                payload=point.payload or {},
            )
        scores[point_id].score += rrf_score
        scores[point_id].sparse_rank = rank

    # Sort by fused score descending
    fused = sorted(scores.values(), key=lambda r: r.score, reverse=True)
    return fused


def _filter_by_location_radius(
    results: list[SearchResult],
    lat: float,
    lng: float,
    radius_km: float,
) -> list[SearchResult]:
    """Post-filter results by geographic radius using Haversine distance.

    Qdrant doesn't natively support geo-radius on non-geo fields,
    so we do client-side filtering on lat/lng payload fields.
    """
    R = 6371.0  # Earth radius in km

    def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlng / 2) ** 2
        )
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    filtered = []
    for result in results:
        p_lat = result.payload.get("latitude")
        p_lng = result.payload.get("longitude")
        if p_lat is not None and p_lng is not None:
            dist = haversine(lat, lng, p_lat, p_lng)
            if dist <= radius_km:
                result.payload["distance_km"] = round(dist, 2)
                filtered.append(result)
        else:
            # Include results without coordinates (don't penalise missing data)
            filtered.append(result)

    return filtered


async def hybrid_search(
    query: str,
    filters: SearchFilters | None = None,
    top_k: int = 20,
    dense_weight: float = 0.6,
    sparse_weight: float = 0.4,
    exclude_ids: list[str] | None = None,
) -> HybridSearchResponse:
    """Execute hybrid dense + sparse search with RRF fusion.

    Steps:
    1. Generate dense embedding from query text
    2. Generate sparse BM25 vector from query text
    3. Execute parallel searches on Qdrant
    4. Apply RRF fusion
    5. Post-filter by location radius if specified
    6. Exclude already-seen IDs
    7. Return top-K results

    Args:
        query: Natural language search query.
        filters: Optional structured filters.
        top_k: Number of results to return.
        dense_weight: Weight for dense results in RRF.
        sparse_weight: Weight for sparse results in RRF.
        exclude_ids: IDs to exclude from results (dedup).

    Returns:
        HybridSearchResponse with fused results.
    """
    if not query.strip():
        return HybridSearchResponse(results=[], query=query)

    filters = filters or SearchFilters()

    logger.info(
        "hybrid_search_start",
        query=query[:100],
        top_k=top_k,
        dense_weight=dense_weight,
        sparse_weight=sparse_weight,
    )

    # Step 1: Generate embeddings
    dense_embedding = await generate_embedding(query)
    sparse_vector = generate_sparse_vector(query)

    # Step 2: Build Qdrant filter
    qdrant_filter = _build_qdrant_filter(filters)

    # Step 3: Execute searches
    client = get_qdrant_client()
    collection = settings.property_collection

    # Fetch more than top_k to allow for post-filtering
    search_limit = top_k * 3

    try:
        # Dense search (semantic)
        dense_results = client.search(
            collection_name=collection,
            query_vector=NamedVector(name="text", vector=dense_embedding),
            query_filter=qdrant_filter,
            limit=search_limit,
            with_payload=True,
        )

        # Sparse search (BM25)
        sparse_results = client.search(
            collection_name=collection,
            query_vector=NamedSparseVector(
                name="bm25",
                vector=SparseVector(
                    indices=sparse_vector["indices"],
                    values=sparse_vector["values"],
                ),
            ),
            query_filter=qdrant_filter,
            limit=search_limit,
            with_payload=True,
        )

    except Exception as e:
        logger.error("qdrant_search_error", error=str(e))
        return HybridSearchResponse(results=[], query=query)

    logger.info(
        "search_raw_results",
        dense_count=len(dense_results),
        sparse_count=len(sparse_results),
    )

    # Step 4: RRF fusion
    fused = _reciprocal_rank_fusion(
        dense_results=dense_results,
        sparse_results=sparse_results,
        dense_weight=dense_weight,
        sparse_weight=sparse_weight,
    )

    # Step 5: Location radius post-filter
    if filters.latitude is not None and filters.longitude is not None and filters.radius_km:
        fused = _filter_by_location_radius(
            fused,
            lat=filters.latitude,
            lng=filters.longitude,
            radius_km=filters.radius_km,
        )

    # Step 6: Exclude already-seen IDs
    if exclude_ids:
        exclude_set = set(exclude_ids)
        fused = [r for r in fused if r.id not in exclude_set]

    # Step 7: Trim to top_k
    results = fused[:top_k]

    filters_applied = {
        k: v for k, v in {
            "min_price": filters.min_price,
            "max_price": filters.max_price,
            "min_bedrooms": filters.min_bedrooms,
            "max_bedrooms": filters.max_bedrooms,
            "property_type": filters.property_type,
            "city": filters.city,
            "postcode": filters.postcode,
            "status": filters.status,
            "radius_km": filters.radius_km,
        }.items()
        if v is not None
    }

    logger.info(
        "hybrid_search_complete",
        query=query[:100],
        total_results=len(results),
        filters=filters_applied,
    )

    return HybridSearchResponse(
        results=results,
        total_dense=len(dense_results),
        total_sparse=len(sparse_results),
        query=query,
        filters_applied=filters_applied,
    )


async def dense_only_search(
    query: str,
    filters: SearchFilters | None = None,
    top_k: int = 20,
) -> HybridSearchResponse:
    """Dense-only semantic search (no sparse/BM25 component).

    Useful when the query is very semantic / conversational.
    """
    return await hybrid_search(
        query=query,
        filters=filters,
        top_k=top_k,
        dense_weight=1.0,
        sparse_weight=0.0,
    )


async def image_similarity_search(
    image_embedding: list[float],
    filters: SearchFilters | None = None,
    top_k: int = 10,
) -> list[SearchResult]:
    """Search for similar properties by CLIP image embedding (S4-08).

    Args:
        image_embedding: 768-dim CLIP embedding vector.
        filters: Optional structured filters.
        top_k: Number of results.

    Returns:
        List of SearchResult sorted by similarity.
    """
    # Note: requires "image" vector name in collection
    # The image vector is added to the collection during re-embedding (Sprint 3)
    client = get_qdrant_client()
    qdrant_filter = _build_qdrant_filter(filters) if filters else None

    try:
        results = client.search(
            collection_name=settings.property_collection,
            query_vector=NamedVector(name="image", vector=image_embedding),
            query_filter=qdrant_filter,
            limit=top_k,
            with_payload=True,
        )

        return [
            SearchResult(
                id=str(point.id),
                score=point.score,
                payload=point.payload or {},
            )
            for point in results
        ]
    except Exception as e:
        logger.error("image_search_error", error=str(e))
        return []
