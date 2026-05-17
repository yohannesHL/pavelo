"""
Hybrid Search API Routes (S4-01)

POST /api/v1/search/hybrid — Dense + sparse fusion search
POST /api/v1/search/similar-image — CLIP image similarity search (S4-08)
"""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.search.hybrid import (
    SearchFilters,
    hybrid_search,
    image_similarity_search,
)

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/search", tags=["search"])


# --- Request / Response Models ---


class SearchFiltersInput(BaseModel):
    """Structured filters from query decomposition or UI."""
    min_price: int | None = Field(None, ge=0, description="Minimum price filter")
    max_price: int | None = Field(None, ge=0, description="Maximum price filter")
    min_bedrooms: int | None = Field(None, ge=0, description="Minimum bedrooms")
    max_bedrooms: int | None = Field(None, ge=0, le=20, description="Maximum bedrooms")
    property_type: str | None = Field(None, description="Property type filter")
    city: str | None = Field(None, description="City filter")
    postcode: str | None = Field(None, description="Postcode filter")
    status: str | None = Field(None, description="Listing status filter")
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    radius_km: float | None = Field(None, ge=0, le=100, description="Search radius in km")


class HybridSearchRequest(BaseModel):
    """Request body for hybrid search."""
    query: str = Field(..., min_length=1, max_length=500, description="Search query text")
    filters: SearchFiltersInput | None = None
    top_k: int = Field(20, ge=1, le=100, description="Number of results")
    dense_weight: float = Field(0.6, ge=0, le=1, description="Weight for dense (semantic) results")
    sparse_weight: float = Field(0.4, ge=0, le=1, description="Weight for sparse (BM25) results")
    exclude_ids: list[str] | None = Field(None, description="IDs to exclude (dedup)")


class SearchResultItem(BaseModel):
    """Single search result."""
    id: str
    score: float
    dense_rank: int | None = None
    sparse_rank: int | None = None
    payload: dict[str, Any] = {}


class HybridSearchResponse(BaseModel):
    """Hybrid search response."""
    results: list[SearchResultItem]
    total_dense: int
    total_sparse: int
    query: str
    filters_applied: dict[str, Any] = {}


class ImageSearchRequest(BaseModel):
    """Request for image similarity search."""
    image_url: str | None = Field(None, description="URL of image to find similar properties")
    embedding: list[float] | None = Field(None, description="Pre-computed CLIP embedding (768d)")
    filters: SearchFiltersInput | None = None
    top_k: int = Field(10, ge=1, le=50)


class ImageSearchResponse(BaseModel):
    """Image similarity search response."""
    results: list[SearchResultItem]
    total: int


# --- Endpoints ---


@router.post("/hybrid", response_model=HybridSearchResponse)
async def search_hybrid(request: HybridSearchRequest):
    """Hybrid dense + sparse search with RRF fusion.

    Combines semantic (text-embedding-3-large) and keyword (BM25)
    search results using Reciprocal Rank Fusion scoring.
    Supports structured filters for price, bedrooms, property type, etc.
    """
    try:
        # Convert input filters to SearchFilters
        filters = None
        if request.filters:
            filters = SearchFilters(
                min_price=request.filters.min_price,
                max_price=request.filters.max_price,
                min_bedrooms=request.filters.min_bedrooms,
                max_bedrooms=request.filters.max_bedrooms,
                property_type=request.filters.property_type,
                city=request.filters.city,
                postcode=request.filters.postcode,
                status=request.filters.status,
                latitude=request.filters.latitude,
                longitude=request.filters.longitude,
                radius_km=request.filters.radius_km,
            )

        response = await hybrid_search(
            query=request.query,
            filters=filters,
            top_k=request.top_k,
            dense_weight=request.dense_weight,
            sparse_weight=request.sparse_weight,
            exclude_ids=request.exclude_ids,
        )

        return HybridSearchResponse(
            results=[
                SearchResultItem(
                    id=r.id,
                    score=r.score,
                    dense_rank=r.dense_rank,
                    sparse_rank=r.sparse_rank,
                    payload=r.payload,
                )
                for r in response.results
            ],
            total_dense=response.total_dense,
            total_sparse=response.total_sparse,
            query=response.query,
            filters_applied=response.filters_applied,
        )

    except Exception as e:
        logger.error("hybrid_search_endpoint_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/similar-image", response_model=ImageSearchResponse)
async def search_similar_image(request: ImageSearchRequest):
    """Find properties similar to a given image (S4-08).

    Accepts either an image URL (which will be embedded via CLIP)
    or a pre-computed CLIP embedding vector.
    """
    try:
        embedding: list[float]

        if request.embedding:
            # Use pre-computed embedding
            if len(request.embedding) != 768:
                raise HTTPException(
                    status_code=400,
                    detail=f"CLIP embedding must be 768 dimensions, got {len(request.embedding)}",
                )
            embedding = request.embedding

        elif request.image_url:
            # Download and embed via CLIP
            from src.models.clip import clip_loader
            import httpx
            import io
            from PIL import Image

            if not clip_loader.is_loaded:
                await clip_loader.load()

            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                resp = await client.get(request.image_url)
                resp.raise_for_status()
                img = Image.open(io.BytesIO(resp.content)).convert("RGB")

            embeddings = await clip_loader.embed_images([img])
            embedding = embeddings[0]

        else:
            raise HTTPException(
                status_code=400,
                detail="Either image_url or embedding must be provided",
            )

        # Convert filters
        filters = None
        if request.filters:
            filters = SearchFilters(
                min_price=request.filters.min_price,
                max_price=request.filters.max_price,
                min_bedrooms=request.filters.min_bedrooms,
                max_bedrooms=request.filters.max_bedrooms,
                property_type=request.filters.property_type,
                city=request.filters.city,
                postcode=request.filters.postcode,
                status=request.filters.status,
            )

        results = await image_similarity_search(
            image_embedding=embedding,
            filters=filters,
            top_k=request.top_k,
        )

        return ImageSearchResponse(
            results=[
                SearchResultItem(
                    id=r.id,
                    score=r.score,
                    payload=r.payload,
                )
                for r in results
            ],
            total=len(results),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("image_search_endpoint_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Image search failed: {str(e)}")
