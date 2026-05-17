"""
Analysis Routes (S3-04, S3-05)

POST /api/v1/analyse/interior   — Interior attribute extraction via GPT-4V
POST /api/v1/analyse/condition  — Era estimation + condition scoring
"""

from __future__ import annotations

import io

import structlog
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel, Field

from src.models.vision import InteriorAttributes
from src.models.condition import EraEstimation, ConditionScores

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/analyse", tags=["analyse"])


class InteriorAnalysisResponse(BaseModel):
    """Response for interior attribute extraction."""
    attributes: InteriorAttributes
    model: str = "gpt-4o"


class ConditionAnalysisResponse(BaseModel):
    """Response for era + condition analysis."""
    era: EraEstimation
    condition: ConditionScores


@router.post("/interior", response_model=InteriorAnalysisResponse)
async def analyse_interior_endpoint(file: UploadFile = File(...)):
    """Extract interior attributes from a property image.

    Uses GPT-4V to analyse the image and extract structured attributes
    including flooring type, kitchen style, ceiling height, natural light,
    period features, and renovation quality.
    """
    try:
        from PIL import Image
        from src.models.vision import analyse_interior

        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")

        attributes = await analyse_interior(image)

        return InteriorAnalysisResponse(attributes=attributes)

    except Exception as e:
        logger.error("interior_analysis_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Interior analysis failed: {str(e)}",
        )


@router.post("/condition", response_model=ConditionAnalysisResponse)
async def analyse_condition_endpoint(file: UploadFile = File(...)):
    """Estimate construction era and score property condition.

    Era estimation uses CLIP zero-shot classification.
    Condition scoring uses GPT-4V for 1-10 ratings across:
    kitchen, bathroom, decor, garden, exterior.
    """
    try:
        from PIL import Image
        from src.models.condition import analyse_condition

        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")

        result = await analyse_condition(image)

        return ConditionAnalysisResponse(era=result.era, condition=result.condition)

    except Exception as e:
        logger.error("condition_analysis_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Condition analysis failed: {str(e)}",
        )
