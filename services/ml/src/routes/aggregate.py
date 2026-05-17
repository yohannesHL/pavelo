"""
Aggregation Routes (S3-06, S3-07)

POST /api/v1/analyse/aggregate  — Merge all classifier outputs into unified PropertyAttributes
POST /api/v1/analyse/reembed    — Trigger re-embedding with image attributes
"""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.pipelines.aggregation import (
    PropertyAttributes,
    aggregate_property_attributes,
)

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/analyse", tags=["aggregate"])


class AggregateRequest(BaseModel):
    """Request to aggregate all classifier outputs for a property."""
    property_id: str
    scene_results: list[dict[str, Any]] = Field(default_factory=list)
    style_results: list[dict[str, Any]] = Field(default_factory=list)
    era_result: dict[str, Any] | None = None
    condition_result: dict[str, Any] | None = None
    interior_results: list[dict[str, Any]] = Field(default_factory=list)
    per_image_data: dict[str, Any] | None = None


class ReembedRequest(BaseModel):
    """Request to re-embed a property with image attributes."""
    property_id: str
    property_data: dict[str, Any]
    attributes: dict[str, Any]


class ReembedResponse(BaseModel):
    """Response for re-embedding request."""
    success: bool
    property_id: str
    enriched_text_length: int | None = None


@router.post("/aggregate", response_model=PropertyAttributes)
async def aggregate_endpoint(request: AggregateRequest):
    """Merge all classifier outputs into a unified PropertyAttributes JSON.

    Combines scene classification, architectural style, era estimation,
    condition scoring, and interior attribute extraction into a single
    property-level attribute model with feature tags.
    """
    try:
        result = aggregate_property_attributes(
            property_id=request.property_id,
            scene_results=request.scene_results,
            style_results=request.style_results,
            era_result=request.era_result,
            condition_result=request.condition_result,
            interior_results=request.interior_results,
            per_image_data=request.per_image_data,
        )

        return result

    except Exception as e:
        logger.error("aggregate_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


@router.post("/reembed", response_model=ReembedResponse)
async def reembed_endpoint(request: ReembedRequest):
    """Trigger re-embedding of a property with image-derived attributes.

    Regenerates the property embedding using enriched text that includes
    image-derived attributes (style, era, features, etc.) and updates
    the Qdrant vector + payload.
    """
    try:
        from src.pipelines.aggregation import PropertyAttributes as PA
        from src.pipelines.reembed import regenerate_property_embedding

        attributes = PA(**request.attributes)

        success = await regenerate_property_embedding(
            property_data=request.property_data,
            attributes=attributes,
        )

        return ReembedResponse(
            success=success,
            property_id=request.property_id,
        )

    except Exception as e:
        logger.error("reembed_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Re-embedding failed: {str(e)}")
