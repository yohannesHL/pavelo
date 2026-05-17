"""
Era Estimation & Condition Scoring (S3-05)

Era estimation and condition scoring using CLIP zero-shot classification
and GPT-4V structured output.

Era categories:
- pre-1900: Victorian and earlier
- 1900-1939: Edwardian, inter-war
- 1945-1979: Post-war, mid-century
- 1980-1999: Late 20th century
- 2000-2015: Early 21st century
- post-2015: Recent/new build

Condition scoring:
- 1-10 scale across: kitchen, bathroom, decor, garden, exterior
"""

from __future__ import annotations

import base64
import io
import json
from typing import Any

import structlog
from PIL import Image
from pydantic import BaseModel, Field

from src.config import settings
from src.models.clip import clip_loader

logger = structlog.get_logger()

# Era categories with descriptive prompts
ERA_LABELS = [
    "pre-1900",
    "1900-1939",
    "1945-1979",
    "1980-1999",
    "2000-2015",
    "post-2015",
]

ERA_PROMPTS = {
    "pre-1900": (
        "a residential property built before 1900, Victorian or earlier era, "
        "with period features, ornate details, aged brickwork"
    ),
    "1900-1939": (
        "a residential property built between 1900 and 1939, Edwardian or inter-war era, "
        "with bay windows, red brick, wider frontage"
    ),
    "1945-1979": (
        "a residential property built between 1945 and 1979, post-war era, "
        "with concrete elements, functional design, council housing style"
    ),
    "1980-1999": (
        "a residential property built between 1980 and 1999, late 20th century, "
        "with standard brick, uPVC windows, typical estate design"
    ),
    "2000-2015": (
        "a residential property built between 2000 and 2015, early 21st century, "
        "with modern design, mixed materials, energy-efficient features"
    ),
    "post-2015": (
        "a newly built residential property after 2015, contemporary construction, "
        "with modern materials, clean lines, developer-standard finishes"
    ),
}


class EraEstimation(BaseModel):
    """Era estimation result."""
    era: str = Field(..., description="Estimated construction era")
    confidence: float = Field(..., ge=0.0, le=1.0)
    all_scores: list[dict[str, Any]] = Field(default_factory=list)


class ConditionScores(BaseModel):
    """Condition scoring result on 1-10 scale."""
    kitchen: int | None = Field(None, ge=1, le=10, description="Kitchen condition score")
    bathroom: int | None = Field(None, ge=1, le=10, description="Bathroom condition score")
    decor: int = Field(5, ge=1, le=10, description="Interior decor/finish score")
    garden: int | None = Field(None, ge=1, le=10, description="Garden condition score")
    exterior: int | None = Field(None, ge=1, le=10, description="Exterior condition score")
    overall: int = Field(5, ge=1, le=10, description="Overall condition score")
    notes: str | None = Field(None, description="Condition assessment notes")


class ConditionAnalysis(BaseModel):
    """Combined era + condition analysis."""
    era: EraEstimation
    condition: ConditionScores


async def estimate_era(image: Image.Image) -> EraEstimation:
    """Estimate the construction era of a property using CLIP.

    Uses zero-shot classification with era-specific prompts.

    Args:
        image: PIL Image of a property (ideally exterior).

    Returns:
        EraEstimation with predicted era and confidence scores.
    """
    if not clip_loader.is_loaded:
        await clip_loader.load()

    import torch

    labels = list(ERA_PROMPTS.keys())
    prompts = list(ERA_PROMPTS.values())

    img_tensor = clip_loader.preprocess_image(image).unsqueeze(0).to(clip_loader._device)
    text_tokens = clip_loader._tokenizer(prompts).to(clip_loader._device)

    with torch.no_grad():
        img_features = clip_loader._model.encode_image(img_tensor)
        text_features = clip_loader._model.encode_text(text_tokens)

        img_features = img_features / img_features.norm(dim=-1, keepdim=True)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

        similarities = (img_features @ text_features.T).squeeze(0)
        probs = torch.softmax(similarities * 100.0, dim=-1)

    scores = []
    for label, prob in zip(labels, probs.cpu().numpy()):
        scores.append({"label": label, "confidence": round(float(prob), 4)})

    scores.sort(key=lambda x: x["confidence"], reverse=True)

    logger.info(
        "era_estimated",
        era=scores[0]["label"],
        confidence=scores[0]["confidence"],
    )

    return EraEstimation(
        era=scores[0]["label"],
        confidence=scores[0]["confidence"],
        all_scores=scores,
    )


CONDITION_PROMPT = """You are an expert property surveyor assessing the condition of a UK residential property from a photograph.

Rate the visible aspects on a scale of 1-10 where:
- 1-2: Poor — significant deterioration, needs major renovation
- 3-4: Below average — noticeable wear, outdated finishes
- 5-6: Average — functional, typical for age
- 7-8: Good — well-maintained, modern finishes
- 9-10: Excellent — high-end, recently renovated or new

Assess ONLY what is visible. Use null for categories that cannot be assessed from this image.

Return JSON with these fields:
- kitchen: score or null
- bathroom: score or null
- decor: integer score for interior decor/finish quality
- garden: score or null
- exterior: score or null
- overall: integer score for overall impression
- notes: brief text assessment (one sentence)

Respond ONLY with valid JSON. No markdown."""


async def score_condition(image: Image.Image) -> ConditionScores:
    """Score property condition using GPT-4V.

    Analyses the image and provides 1-10 scores for visible categories.

    Args:
        image: PIL Image of a property.

    Returns:
        ConditionScores with per-category ratings.
    """
    import asyncio

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    buffered = io.BytesIO()
    image.save(buffered, format="JPEG", quality=85)
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    for attempt in range(3):
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": CONDITION_PROMPT},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{img_b64}",
                                    "detail": "low",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=500,
                temperature=0.1,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content
            parsed = json.loads(raw)
            result = ConditionScores(**parsed)

            logger.info(
                "condition_scored",
                overall=result.overall,
                attempt=attempt + 1,
            )

            return result

        except Exception as e:
            logger.warning("condition_score_retry", attempt=attempt + 1, error=str(e))
            if attempt < 2:
                await asyncio.sleep(2 ** (attempt + 1))

    # Fallback: return neutral scores
    logger.error("condition_score_failed_fallback")
    return ConditionScores(overall=5, decor=5, notes="Unable to assess from image")


async def analyse_condition(image: Image.Image) -> ConditionAnalysis:
    """Full era + condition analysis pipeline.

    Runs era estimation (CLIP) and condition scoring (GPT-4V) together.

    Args:
        image: PIL Image of a property.

    Returns:
        Combined ConditionAnalysis with era and condition data.
    """
    import asyncio

    era_result, condition_result = await asyncio.gather(
        estimate_era(image),
        score_condition(image),
    )

    return ConditionAnalysis(era=era_result, condition=condition_result)
