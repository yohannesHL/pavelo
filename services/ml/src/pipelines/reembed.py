"""
Embedding Regeneration Pipeline (S3-07)

When image analysis completes, triggers re-embedding of the property with
updated natural language description enriched by image-derived attributes.

Pipeline:
1. Fetch property data from DB
2. Enrich description with image-derived attributes (style, era, features)
3. Re-embed via OpenAI text-embedding-3-large
4. Upsert updated vector to Qdrant with image attribute payload
"""

from __future__ import annotations

from typing import Any

import structlog

from src.config import settings
from src.pipelines.property_embed import (
    synthesise_description,
    generate_embedding,
)
from src.pipelines.aggregation import PropertyAttributes

logger = structlog.get_logger()


def enrich_description_with_image_attributes(
    base_text: str,
    attributes: PropertyAttributes,
) -> str:
    """Enrich a property description with image-derived attributes.

    Appends architectural style, era, interior attributes, and feature tags
    to the base synthesised description for improved embedding quality.

    Args:
        base_text: Original synthesised text description.
        attributes: Aggregated property attributes from image analysis.

    Returns:
        Enriched text description.
    """
    enrichments: list[str] = []

    if attributes.primary_style:
        enrichments.append(f"Architectural style: {attributes.primary_style}.")

    if attributes.era:
        enrichments.append(f"Estimated era: {attributes.era}.")

    if attributes.flooring_types:
        enrichments.append(f"Flooring: {', '.join(attributes.flooring_types)}.")

    if attributes.kitchen_style:
        enrichments.append(f"Kitchen style: {attributes.kitchen_style}.")

    if attributes.ceiling_height and attributes.ceiling_height != "standard":
        enrichments.append(f"Ceiling height: {attributes.ceiling_height}.")

    if attributes.natural_light and attributes.natural_light != "moderate":
        enrichments.append(f"Natural light: {attributes.natural_light}.")

    if attributes.renovation_quality:
        enrichments.append(f"Condition: {attributes.renovation_quality}.")

    if attributes.period_features:
        enrichments.append(
            f"Period features: {', '.join(attributes.period_features)}."
        )

    if attributes.feature_tags:
        enrichments.append(
            f"Features: {', '.join(attributes.feature_tags)}."
        )

    if attributes.rooms_detected:
        enrichments.append(
            f"Rooms: {', '.join(attributes.rooms_detected)}."
        )

    if enrichments:
        return f"{base_text} {' '.join(enrichments)}"

    return base_text


def build_image_attribute_payload(attributes: PropertyAttributes) -> dict[str, Any]:
    """Build Qdrant payload metadata from image attributes.

    These fields are added to the Qdrant point payload to enable
    filtering on image-derived attributes during search.

    Args:
        attributes: Aggregated property attributes.

    Returns:
        Dict of image attribute fields for Qdrant payload.
    """
    return {
        "architectural_style": attributes.primary_style,
        "construction_era": attributes.era,
        "era_confidence": attributes.era_confidence,
        "condition_overall": attributes.condition.overall,
        "condition_kitchen": attributes.condition.kitchen,
        "condition_bathroom": attributes.condition.bathroom,
        "renovation_quality": attributes.renovation_quality,
        "ceiling_height": attributes.ceiling_height,
        "natural_light": attributes.natural_light,
        "flooring_types": attributes.flooring_types,
        "kitchen_style": attributes.kitchen_style,
        "period_features": attributes.period_features,
        "feature_tags": attributes.feature_tags,
        "rooms_detected": attributes.rooms_detected,
        "images_analysed": attributes.images_analysed,
    }


async def regenerate_property_embedding(
    property_data: dict[str, Any],
    attributes: PropertyAttributes,
) -> bool:
    """Regenerate property embedding with image-derived attributes.

    Full pipeline:
    1. Synthesise base description from property data
    2. Enrich with image-derived attributes
    3. Generate new embedding via OpenAI
    4. Upsert to Qdrant with updated payload

    Args:
        property_data: Full property record from DB.
        attributes: Aggregated ML attributes.

    Returns:
        True if re-embedding succeeded.
    """
    from src.pipelines.property_embed import build_qdrant_payload
    from src.pipelines.hybrid_search import upsert_with_sparse

    property_id = property_data.get("id", "")
    if not property_id:
        logger.error("reembed_missing_id")
        return False

    try:
        # Step 1: Synthesise base description
        base_text = synthesise_description(property_data)

        # Step 2: Enrich with image attributes
        enriched_text = enrich_description_with_image_attributes(base_text, attributes)

        logger.info(
            "reembed_enriched",
            property_id=property_id,
            base_len=len(base_text),
            enriched_len=len(enriched_text),
        )

        # Step 3: Generate new embedding
        embedding = await generate_embedding(enriched_text)

        # Step 4: Build payload with both structural + image attributes
        payload = build_qdrant_payload(property_data)
        payload["synthesised_text"] = enriched_text
        payload.update(build_image_attribute_payload(attributes))

        # Step 5: Upsert with sparse vector for hybrid search
        success = await upsert_with_sparse(
            property_id=property_id,
            dense_embedding=embedding,
            sparse_text=enriched_text,
            payload=payload,
        )

        if success:
            logger.info(
                "reembed_complete",
                property_id=property_id,
                style=attributes.primary_style,
                era=attributes.era,
                n_features=len(attributes.feature_tags),
            )

        return success

    except Exception as e:
        logger.error(
            "reembed_failed",
            property_id=property_id,
            error=str(e),
        )
        return False
