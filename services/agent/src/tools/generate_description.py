"""
AI Property Description Generator (S8-03)

Generates a professional property listing description
from structured attributes, using OpenAI or a template fallback.
"""

from __future__ import annotations

import json
from typing import Any, Optional

import structlog

from src.config import settings

logger = structlog.get_logger()


async def generate_description_impl(
    property_type: str,
    bedrooms: int,
    bathrooms: int,
    square_feet: Optional[int] = None,
    year_built: Optional[int] = None,
    features: list[str] | None = None,
    address: str = "",
    postcode: str = "",
) -> dict[str, Any]:
    """Generate a property description from attributes.

    Tries OpenAI first; falls back to template-based generation.

    Returns:
        Dict with 'description' text and metadata.
    """
    features = features or []

    # Try OpenAI generation
    if settings.openai_api_key:
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.openai_api_key)

            prompt = _build_prompt(
                property_type, bedrooms, bathrooms,
                square_feet, year_built, features, address, postcode,
            )

            response = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a professional UK estate agent copywriter. "
                            "Write compelling, accurate property descriptions. "
                            "Use British English. Be factual but enticing. "
                            "2-3 paragraphs. No made-up details."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=500,
                temperature=0.7,
            )

            description = response.choices[0].message.content or ""
            return {
                "status": "success",
                "description": description.strip(),
                "source": "ai",
            }

        except Exception as e:
            logger.warning("openai_description_fallback", error=str(e))

    # Fallback: template-based generation
    description = _template_description(
        property_type, bedrooms, bathrooms,
        square_feet, year_built, features, address, postcode,
    )

    return {
        "status": "success",
        "description": description,
        "source": "template",
    }


def _build_prompt(
    property_type: str,
    bedrooms: int,
    bathrooms: int,
    square_feet: Optional[int],
    year_built: Optional[int],
    features: list[str],
    address: str,
    postcode: str,
) -> str:
    """Build the prompt for AI description generation."""
    parts = [
        f"Write a property listing description for:",
        f"- Type: {property_type.replace('_', ' ')}",
        f"- Bedrooms: {bedrooms}",
        f"- Bathrooms: {bathrooms}",
    ]

    if square_feet:
        parts.append(f"- Floor area: {square_feet:,} sq ft")
    if year_built:
        parts.append(f"- Year built: {year_built}")
    if address:
        parts.append(f"- Location: {address}")
    if postcode:
        parts.append(f"- Postcode area: {postcode}")
    if features:
        parts.append(f"- Features: {', '.join(features)}")

    return "\n".join(parts)


def _template_description(
    property_type: str,
    bedrooms: int,
    bathrooms: int,
    square_feet: Optional[int],
    year_built: Optional[int],
    features: list[str],
    address: str,
    postcode: str,
) -> str:
    """Generate a template-based property description."""
    type_name = property_type.replace("_", "-")
    bed_word = "bedroom" if bedrooms == 1 else "bedrooms"
    bath_word = "bathroom" if bathrooms == 1 else "bathrooms"

    intro = f"A well-presented {bedrooms} {bed_word} {type_name}"

    if year_built and year_built < 1930:
        intro = f"A charming period {bedrooms} {bed_word} {type_name}"
    elif year_built and year_built >= 2020:
        intro = f"A modern {bedrooms} {bed_word} {type_name}"

    location = ""
    if postcode:
        location = f" situated in the sought-after {postcode} area"
    elif address:
        location = f" located on {address}"

    size = ""
    if square_feet:
        size = f" The property offers approximately {square_feet:,} sq ft of living space."

    features_text = ""
    if features:
        if len(features) == 1:
            features_text = f" Key features include {features[0].lower()}."
        elif len(features) <= 3:
            features_text = (
                f" Key features include {', '.join(f.lower() for f in features[:-1])} "
                f"and {features[-1].lower()}."
            )
        else:
            top = features[:4]
            features_text = (
                f" The property boasts {', '.join(f.lower() for f in top[:-1])}, "
                f"and {top[-1].lower()}, among other desirable features."
            )

    return (
        f"{intro}{location}, offering {bathrooms} {bath_word}.{size}"
        f"{features_text}\n\n"
        f"This property represents an excellent opportunity for buyers "
        f"seeking a quality home in a desirable location. "
        f"Early viewings are highly recommended."
    )
