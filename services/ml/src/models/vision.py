"""
GPT-4V / Vision LLM Integration (S3-04)

Interior attribute extraction using OpenAI GPT-4V (with fallback prompt
structure for Llama 3.2 Vision). Extracts structured JSON attributes
from property interior photographs.

Extracted attributes:
- flooring_type: hardwood, carpet, tile, laminate, concrete, stone, vinyl
- kitchen_style: modern, traditional, shaker, handleless, galley, island
- ceiling_height: standard, high, double-height, low
- natural_light: abundant, good, moderate, limited, poor
- period_features: list of detected features (cornicing, fireplaces, etc.)
- renovation_quality: new, recently-renovated, well-maintained, dated, needs-work
"""

from __future__ import annotations

import base64
import io
from typing import Any

import structlog
from PIL import Image
from pydantic import BaseModel, Field

from src.config import settings

logger = structlog.get_logger()


class InteriorAttributes(BaseModel):
    """Structured interior attribute extraction result."""
    flooring_type: str = Field(
        ...,
        description="Primary flooring type visible in the image",
    )
    kitchen_style: str | None = Field(
        None,
        description="Kitchen style if a kitchen is visible",
    )
    ceiling_height: str = Field(
        "standard",
        description="Estimated ceiling height category",
    )
    natural_light: str = Field(
        "moderate",
        description="Natural light level assessment",
    )
    period_features: list[str] = Field(
        default_factory=list,
        description="Detected period/architectural features",
    )
    renovation_quality: str = Field(
        "well-maintained",
        description="Overall renovation/maintenance quality assessment",
    )
    room_type: str = Field(
        ...,
        description="Detected room type (living room, kitchen, bedroom, bathroom, etc.)",
    )
    additional_notes: str | None = Field(
        None,
        description="Any other notable observations about the interior",
    )


INTERIOR_ANALYSIS_PROMPT = """You are an expert property surveyor and interior designer analysing a UK residential property photograph.

Analyse this interior image and extract the following attributes as structured JSON:

1. **flooring_type**: The primary flooring visible. Options: hardwood, engineered-wood, carpet, tile, ceramic, laminate, concrete, stone, vinyl, parquet, or "mixed" if multiple visible.

2. **kitchen_style**: If a kitchen is visible, classify it. Options: modern, traditional, shaker, handleless, galley, island, farmhouse, industrial, or null if not a kitchen.

3. **ceiling_height**: Estimate category. Options: standard (2.4m), high (2.7m+), double-height (4m+), low (<2.3m).

4. **natural_light**: Assess natural light. Options: abundant, good, moderate, limited, poor.

5. **period_features**: List any period/architectural features visible. Examples: cornicing, coving, ceiling rose, picture rail, dado rail, original fireplace, exposed beams, sash windows, stained glass, ornate plasterwork, archway, alcoves, panelling.

6. **renovation_quality**: Assess overall condition. Options: new-build, recently-renovated, well-maintained, dated, needs-work.

7. **room_type**: What room is this? Options: living-room, kitchen, bedroom, bathroom, en-suite, dining-room, hallway, study, utility, conservatory, loft, basement, reception.

8. **additional_notes**: Any other notable observations (smart home features, underfloor heating visible, bi-fold doors, etc.)

Respond ONLY with valid JSON matching this schema. No markdown, no explanation."""


async def analyse_interior(
    image: Image.Image,
    max_retries: int = 3,
) -> InteriorAttributes:
    """Extract interior attributes from a property image using GPT-4V.

    Uses OpenAI's vision model for structured attribute extraction,
    with Pydantic validation on the output.

    Args:
        image: PIL Image of a property interior.
        max_retries: Maximum retry attempts with exponential backoff.

    Returns:
        Validated InteriorAttributes object.
    """
    import asyncio
    import json

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    # Convert image to base64
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG", quality=85)
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    last_error = None

    for attempt in range(max_retries):
        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": INTERIOR_ANALYSIS_PROMPT},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{img_b64}",
                                    "detail": "high",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=1000,
                temperature=0.1,
                response_format={"type": "json_object"},
            )

            raw_content = response.choices[0].message.content
            parsed = json.loads(raw_content)
            result = InteriorAttributes(**parsed)

            logger.info(
                "interior_analysis_complete",
                room_type=result.room_type,
                flooring=result.flooring_type,
                renovation=result.renovation_quality,
                period_features=len(result.period_features),
                attempt=attempt + 1,
            )

            return result

        except json.JSONDecodeError as e:
            last_error = e
            logger.warning(
                "interior_analysis_json_error",
                attempt=attempt + 1,
                error=str(e),
            )
        except Exception as e:
            last_error = e
            logger.warning(
                "interior_analysis_retry",
                attempt=attempt + 1,
                error=str(e),
            )

        # Exponential backoff: 2s, 4s, 8s
        if attempt < max_retries - 1:
            await asyncio.sleep(2 ** (attempt + 1))

    logger.error("interior_analysis_failed", error=str(last_error))
    raise RuntimeError(f"Interior analysis failed after {max_retries} attempts: {last_error}")
