"""
Feature Tagging Aggregation (S3-06)

Merges all classifier outputs (scene, style, era, condition, interior attributes)
into a unified PropertyAttributes JSON model. Provides a single API endpoint
to aggregate results and store them against the property record.

Feature tags detected:
- open-plan, en-suite, original-features, bi-fold-doors, underfloor-heating,
  smart-home, period-fireplace, bay-windows, sash-windows, exposed-beams,
  high-ceilings, south-facing, garden, parking, garage, loft-conversion,
  basement, conservatory, extension, listed-building
"""

from __future__ import annotations

from typing import Any

import structlog
from pydantic import BaseModel, Field

logger = structlog.get_logger()


class SceneResult(BaseModel):
    """Scene classification result."""
    scene: str
    confidence: float


class StyleResult(BaseModel):
    """Architectural style prediction."""
    label: str
    confidence: float


class EraResult(BaseModel):
    """Era estimation result."""
    era: str
    confidence: float


class ConditionResult(BaseModel):
    """Condition scores."""
    kitchen: int | None = None
    bathroom: int | None = None
    decor: int = 5
    garden: int | None = None
    exterior: int | None = None
    overall: int = 5


class InteriorResult(BaseModel):
    """Interior attribute extraction result."""
    flooring_type: str | None = None
    kitchen_style: str | None = None
    ceiling_height: str = "standard"
    natural_light: str = "moderate"
    period_features: list[str] = Field(default_factory=list)
    renovation_quality: str = "well-maintained"
    room_type: str | None = None


class PropertyAttributes(BaseModel):
    """Unified property attributes aggregated from all classifiers.

    This is the complete ML-derived attribute set for a property,
    combining scene classification, architectural style, era estimation,
    condition scoring, and interior attribute extraction across all
    analysed images.
    """
    property_id: str

    # Scene analysis (per image)
    scenes: list[SceneResult] = Field(default_factory=list)
    primary_scene: str | None = None

    # Architectural style
    styles: list[StyleResult] = Field(default_factory=list)
    primary_style: str | None = None

    # Era estimation
    era: str | None = None
    era_confidence: float = 0.0

    # Condition scoring (aggregated across images)
    condition: ConditionResult = Field(default_factory=ConditionResult)

    # Interior attributes (aggregated across interior images)
    flooring_types: list[str] = Field(default_factory=list)
    kitchen_style: str | None = None
    ceiling_height: str = "standard"
    natural_light: str = "moderate"
    renovation_quality: str = "well-maintained"

    # Period features (union across all images)
    period_features: list[str] = Field(default_factory=list)

    # Feature tags (derived from all analyses)
    feature_tags: list[str] = Field(default_factory=list)

    # Room inventory (detected from scene + interior analysis)
    rooms_detected: list[str] = Field(default_factory=list)

    # Image count
    images_analysed: int = 0

    # Raw per-image results for reference
    per_image_results: dict[str, Any] = Field(default_factory=dict)


# Feature tag detection rules
FEATURE_TAG_RULES = {
    "open-plan": ["open plan", "open-plan", "open living", "kitchen-diner"],
    "en-suite": ["en-suite", "ensuite", "en suite"],
    "original-features": ["original", "period", "heritage"],
    "bi-fold-doors": ["bi-fold", "bifold", "bi fold"],
    "underfloor-heating": ["underfloor", "under-floor"],
    "smart-home": ["smart home", "smart lighting", "home automation"],
    "period-fireplace": ["fireplace", "fire place", "mantelpiece"],
    "bay-windows": ["bay window"],
    "sash-windows": ["sash window"],
    "exposed-beams": ["exposed beam", "timber beam", "oak beam"],
    "high-ceilings": ["high ceiling", "tall ceiling", "double-height"],
    "south-facing": ["south facing", "south-facing", "southerly"],
    "parking": ["parking", "driveway", "car port"],
    "garage": ["garage", "car garage"],
    "loft-conversion": ["loft conversion", "loft room", "attic room"],
    "conservatory": ["conservatory", "sun room", "sunroom"],
    "extension": ["extension", "extended"],
    "garden": ["garden", "rear garden", "front garden", "landscaped garden"],
    "basement": ["basement", "cellar", "lower ground"],
    "listed-building": ["listed building", "listed property", "grade i", "grade ii", "grade 2", "heritage listed"],
}


def detect_feature_tags(
    interior_results: list[InteriorResult],
    period_features: list[str],
    notes: str | None = None,
    scenes: list[SceneResult] | None = None,
) -> list[str]:
    """Detect feature tags from analysis results.

    Scans interior attributes, period features, notes, and scene
    classifications for keywords that map to standard feature tags.

    Args:
        interior_results: List of interior analysis results.
        period_features: Detected period features.
        notes: Additional analysis notes.
        scenes: Optional list of scene classification results.

    Returns:
        List of detected feature tag strings.
    """
    tags: set[str] = set()

    # Build searchable text from all results
    search_text_parts: list[str] = []

    for result in interior_results:
        if result.flooring_type:
            search_text_parts.append(result.flooring_type)
        if result.kitchen_style:
            search_text_parts.append(result.kitchen_style)
        if result.ceiling_height:
            search_text_parts.append(result.ceiling_height)

    search_text_parts.extend(period_features)
    if notes:
        search_text_parts.append(notes)

    search_text = " ".join(search_text_parts).lower()

    for tag, keywords in FEATURE_TAG_RULES.items():
        for keyword in keywords:
            if keyword in search_text:
                tags.add(tag)
                break

    # Check for specific attribute-based tags
    for result in interior_results:
        if result.ceiling_height in ("high", "double-height"):
            tags.add("high-ceilings")
        if result.room_type == "en-suite":
            tags.add("en-suite")
        if result.room_type == "conservatory":
            tags.add("conservatory")

    if period_features:
        tags.add("original-features")
        for feat in period_features:
            feat_lower = feat.lower()
            if "fireplace" in feat_lower:
                tags.add("period-fireplace")
            if "beam" in feat_lower:
                tags.add("exposed-beams")
            if "sash" in feat_lower:
                tags.add("sash-windows")
            if "bay" in feat_lower:
                tags.add("bay-windows")

    # Scene-based tags (e.g. garden scene → garden tag)
    if scenes:
        for scene in scenes:
            if scene.scene == "garden" and scene.confidence > 0.3:
                tags.add("garden")

    return sorted(tags)


def aggregate_property_attributes(
    property_id: str,
    scene_results: list[dict[str, Any]],
    style_results: list[dict[str, Any]],
    era_result: dict[str, Any] | None,
    condition_result: dict[str, Any] | None,
    interior_results: list[dict[str, Any]],
    per_image_data: dict[str, Any] | None = None,
) -> PropertyAttributes:
    """Aggregate all classifier outputs into unified PropertyAttributes.

    Merges per-image classification results into a single property-level
    attribute set with aggregated scores and detected features.

    Args:
        property_id: Property UUID.
        scene_results: List of scene classification results.
        style_results: List of style classification results.
        era_result: Era estimation result dict.
        condition_result: Condition scoring result dict.
        interior_results: List of interior analysis result dicts.
        per_image_data: Optional raw per-image results.

    Returns:
        Unified PropertyAttributes model.
    """
    # Scene aggregation
    scenes = [SceneResult(**s) for s in scene_results] if scene_results else []
    primary_scene = scenes[0].scene if scenes else None

    # Style aggregation (take highest confidence across all images)
    styles = [StyleResult(**s) for s in style_results] if style_results else []
    styles.sort(key=lambda x: x.confidence, reverse=True)
    primary_style = styles[0].label if styles else None

    # Era
    era = era_result.get("era") if era_result else None
    era_confidence = era_result.get("confidence", 0) if era_result else 0.0

    # Condition
    condition = ConditionResult(**(condition_result or {}))

    # Interior attributes aggregation
    parsed_interiors = [InteriorResult(**i) for i in interior_results] if interior_results else []

    flooring_types = list({r.flooring_type for r in parsed_interiors if r.flooring_type})
    kitchen_styles = [r.kitchen_style for r in parsed_interiors if r.kitchen_style]
    kitchen_style = kitchen_styles[0] if kitchen_styles else None

    # Best ceiling height (highest)
    height_order = ["low", "standard", "high", "double-height"]
    heights = [r.ceiling_height for r in parsed_interiors if r.ceiling_height]
    ceiling_height = max(heights, key=lambda h: height_order.index(h) if h in height_order else 0, default="standard")

    # Best natural light
    light_order = ["poor", "limited", "moderate", "good", "abundant"]
    lights = [r.natural_light for r in parsed_interiors if r.natural_light]
    natural_light = max(lights, key=lambda l: light_order.index(l) if l in light_order else 0, default="moderate")

    # Renovation quality (worst across images)
    quality_order = ["needs-work", "dated", "well-maintained", "recently-renovated", "new-build"]
    qualities = [r.renovation_quality for r in parsed_interiors if r.renovation_quality]
    renovation_quality = min(
        qualities,
        key=lambda q: quality_order.index(q) if q in quality_order else 2,
        default="well-maintained",
    )

    # Period features (union)
    all_period = set()
    for r in parsed_interiors:
        all_period.update(r.period_features)
    period_features = sorted(all_period)

    # Rooms detected
    rooms = list({r.room_type for r in parsed_interiors if r.room_type})

    # Feature tags
    feature_tags = detect_feature_tags(parsed_interiors, period_features, scenes=scenes)

    attrs = PropertyAttributes(
        property_id=property_id,
        scenes=scenes,
        primary_scene=primary_scene,
        styles=styles,
        primary_style=primary_style,
        era=era,
        era_confidence=era_confidence,
        condition=condition,
        flooring_types=flooring_types,
        kitchen_style=kitchen_style,
        ceiling_height=ceiling_height,
        natural_light=natural_light,
        renovation_quality=renovation_quality,
        period_features=period_features,
        feature_tags=feature_tags,
        rooms_detected=rooms,
        images_analysed=len(scene_results) if scene_results else 0,
        per_image_results=per_image_data or {},
    )

    logger.info(
        "attributes_aggregated",
        property_id=property_id,
        primary_style=primary_style,
        era=era,
        feature_tags=feature_tags,
        rooms=rooms,
    )

    return attrs
