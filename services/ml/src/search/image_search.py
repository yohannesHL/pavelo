"""
Image Similarity Search Module (S4-08)

CLIP-based image similarity search capabilities:
- Image URL → CLIP embedding → Qdrant search
- Image upload → CLIP embedding → Qdrant search
- Text description → CLIP text embedding → Qdrant image search

Uses the CLIP model from Sprint 3 and the hybrid search engine from S4-01.
"""

from __future__ import annotations

import io
from typing import Any

import structlog
from pydantic import BaseModel, Field

from src.search.hybrid import SearchFilters, SearchResult, image_similarity_search

logger = structlog.get_logger()


class ImageSearchInput(BaseModel):
    """Input for image similarity search."""
    image_url: str | None = Field(None, description="URL of reference image")
    text_description: str | None = Field(
        None, description="Text description for cross-modal search"
    )
    min_price: int | None = None
    max_price: int | None = None
    property_type: str | None = None
    top_k: int = Field(10, ge=1, le=50)


class ImageSearchResult(BaseModel):
    """A result from image similarity search."""
    property_id: str
    similarity_score: float
    title: str = ""
    price: int = 0
    city: str = ""
    property_type: str = ""
    image_urls: list[str] = []


async def search_by_image_url(
    image_url: str,
    filters: SearchFilters | None = None,
    top_k: int = 10,
) -> list[ImageSearchResult]:
    """Find properties with visually similar images.

    Args:
        image_url: URL of the reference image.
        filters: Optional structured filters.
        top_k: Number of results.

    Returns:
        List of similar properties ranked by visual similarity.
    """
    from src.models.clip import clip_loader
    import httpx
    from PIL import Image

    logger.info("image_search_by_url", url=image_url[:100], top_k=top_k)

    try:
        # Load CLIP if needed
        if not clip_loader.is_loaded:
            await clip_loader.load()

        # Download image
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")

        # Generate CLIP embedding
        embeddings = await clip_loader.embed_images([img])
        embedding = embeddings[0]

        # Search Qdrant
        results = await image_similarity_search(
            image_embedding=embedding,
            filters=filters,
            top_k=top_k,
        )

        return [
            ImageSearchResult(
                property_id=r.id,
                similarity_score=r.score,
                title=r.payload.get("title", ""),
                price=r.payload.get("price", 0),
                city=r.payload.get("city", ""),
                property_type=r.payload.get("propertyType", ""),
                image_urls=r.payload.get("images", []),
            )
            for r in results
        ]

    except Exception as e:
        logger.error("image_search_error", error=str(e))
        return []


async def search_by_text_description(
    description: str,
    filters: SearchFilters | None = None,
    top_k: int = 10,
) -> list[ImageSearchResult]:
    """Find properties matching a text description via CLIP cross-modal search.

    Uses CLIP's text encoder to search against image embeddings.
    Example: "modern kitchen with marble countertops" → finds similar kitchens.

    Args:
        description: Text description of desired visual appearance.
        filters: Optional structured filters.
        top_k: Number of results.

    Returns:
        List of visually matching properties.
    """
    from src.models.clip import clip_loader

    logger.info("image_search_by_text", description=description[:100], top_k=top_k)

    try:
        if not clip_loader.is_loaded:
            await clip_loader.load()

        # Generate CLIP text embedding
        text_embedding = await clip_loader.embed_text(description)

        # Search Qdrant image vectors
        results = await image_similarity_search(
            image_embedding=text_embedding,
            filters=filters,
            top_k=top_k,
        )

        return [
            ImageSearchResult(
                property_id=r.id,
                similarity_score=r.score,
                title=r.payload.get("title", ""),
                price=r.payload.get("price", 0),
                city=r.payload.get("city", ""),
                property_type=r.payload.get("propertyType", ""),
                image_urls=r.payload.get("images", []),
            )
            for r in results
        ]

    except Exception as e:
        logger.error("text_image_search_error", error=str(e))
        return []
