"""
Scene Classifier (S3-02)

Classifies property images into scene categories using CLIP zero-shot classification
with property-specific prompts.

Categories:
- exterior: Front or rear external view of a property
- interior: Inside room view (living room, bedroom, hallway, etc.)
- garden: Garden, patio, outdoor space
- floor-plan: Architectural floor plan or layout diagram
- aerial: Drone or satellite aerial view

The classifier uses carefully crafted prompts for each category to improve
accuracy over naive single-word labels.
"""

from __future__ import annotations

from typing import Any

import structlog
from PIL import Image

from src.models.clip import clip_loader

logger = structlog.get_logger()

# Scene categories with descriptive prompts for zero-shot classification
SCENE_LABELS = [
    "exterior",
    "interior",
    "garden",
    "floor-plan",
    "aerial",
]

SCENE_PROMPTS = {
    "exterior": "a photograph of the exterior front or rear of a residential property or house",
    "interior": "a photograph of the interior of a room inside a house, such as a living room, bedroom, kitchen, or bathroom",
    "garden": "a photograph of a residential garden, patio, outdoor terrace, or backyard",
    "floor-plan": "an architectural floor plan, layout diagram, or blueprint of a property",
    "aerial": "an aerial drone or satellite photograph showing a property or neighbourhood from above",
}


async def classify_scene(image: Image.Image) -> list[dict[str, Any]]:
    """Classify a property image into a scene category.

    Uses CLIP zero-shot classification with property-specific prompts.

    Args:
        image: PIL Image of a property.

    Returns:
        List of {label, confidence} dicts sorted by confidence descending.
    """
    if not clip_loader.is_loaded:
        await clip_loader.load()

    prompts = list(SCENE_PROMPTS.values())
    labels = list(SCENE_PROMPTS.keys())

    results = await clip_loader.zero_shot_classify(
        image=image,
        labels=labels,
        prompt_template="{}",
    )

    # Override: use the full prompts for better classification
    import torch

    img_tensor = clip_loader.preprocess_image(image).unsqueeze(0).to(clip_loader._device)
    text_tokens = clip_loader._tokenizer(prompts).to(clip_loader._device)

    with torch.no_grad():
        img_features = clip_loader._model.encode_image(img_tensor)
        text_features = clip_loader._model.encode_text(text_tokens)

        img_features = img_features / img_features.norm(dim=-1, keepdim=True)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

        similarities = (img_features @ text_features.T).squeeze(0)
        probs = torch.softmax(similarities * 100.0, dim=-1)

    results = []
    for label, prob in zip(labels, probs.cpu().numpy()):
        results.append({"label": label, "confidence": round(float(prob), 4)})

    results.sort(key=lambda x: x["confidence"], reverse=True)

    logger.info(
        "scene_classified",
        prediction=results[0]["label"],
        confidence=results[0]["confidence"],
    )

    return results
