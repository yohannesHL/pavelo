"""
Classification Routes (S3-02, S3-03)

POST /api/v1/classify/scene — Scene classification (exterior/interior/garden/floor-plan/aerial)
POST /api/v1/classify/style — Architectural style classification (10 classes, top-3)
"""

from __future__ import annotations

import io

import structlog
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel, Field

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/classify", tags=["classify"])


class ClassificationResult(BaseModel):
    """Single classification prediction."""
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class SceneClassifyResponse(BaseModel):
    """Scene classification response."""
    scene: str = Field(..., description="Predicted scene type")
    confidence: float
    all_scores: list[ClassificationResult]


class StyleClassifyResponse(BaseModel):
    """Architectural style classification response."""
    style: str = Field(..., description="Top predicted architectural style")
    confidence: float
    top_3: list[ClassificationResult]


@router.post("/scene", response_model=SceneClassifyResponse)
async def classify_scene_endpoint(file: UploadFile = File(...)):
    """Classify a property image into scene categories.

    Categories: exterior, interior, garden, floor-plan, aerial.
    Returns the predicted class with confidence scores for all categories.
    """
    try:
        from PIL import Image
        from src.models.scene_classifier import classify_scene

        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")

        results = await classify_scene(image)

        return SceneClassifyResponse(
            scene=results[0]["label"],
            confidence=results[0]["confidence"],
            all_scores=[
                ClassificationResult(label=r["label"], confidence=r["confidence"])
                for r in results
            ],
        )

    except Exception as e:
        logger.error("scene_classify_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Scene classification failed: {str(e)}")


@router.post("/style", response_model=StyleClassifyResponse)
async def classify_style_endpoint(file: UploadFile = File(...)):
    """Classify the architectural style of a property image.

    10 classes: Victorian, Edwardian, Art Deco, Mid-Century, Contemporary,
    New Build, Georgian, Brutalist, Tudor, Regency.

    Returns top-3 predictions with confidence scores.
    """
    try:
        from PIL import Image
        from src.models.style_classifier import classify_style

        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")

        results = await classify_style(image, top_k=3)

        return StyleClassifyResponse(
            style=results[0]["label"],
            confidence=results[0]["confidence"],
            top_3=[
                ClassificationResult(label=r["label"], confidence=r["confidence"])
                for r in results
            ],
        )

    except Exception as e:
        logger.error("style_classify_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Style classification failed: {str(e)}")
