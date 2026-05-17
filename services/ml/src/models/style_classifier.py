"""
Architectural Style Classifier (S3-03)

10-class architectural style classification using CLIP zero-shot inference
with carefully crafted property-specific prompts.

Classes:
- Victorian (1837-1901): ornate, bay windows, red brick, slate roofs
- Edwardian (1901-1910): wider proportions, larger gardens, decorative woodwork
- Art Deco (1920-1939): geometric forms, curved walls, Crittall windows
- Mid-Century (1945-1969): clean lines, large windows, open plan
- Contemporary (2000+): modern design, glass, minimalist
- New Build (recent): developer-built, standard layouts
- Georgian (1714-1837): symmetrical, sash windows, grand proportions
- Brutalist (1950-1975): raw concrete, bold geometric shapes
- Tudor (1485-1603): timber framing, steeply pitched roofs, tall chimneys
- Regency (1811-1820): stucco facades, wrought iron, terraces
"""

from __future__ import annotations

from typing import Any

import structlog
from PIL import Image

from src.models.clip import clip_loader

logger = structlog.get_logger()

STYLE_LABELS = [
    "Victorian",
    "Edwardian",
    "Art Deco",
    "Mid-Century",
    "Contemporary",
    "New Build",
    "Georgian",
    "Brutalist",
    "Tudor",
    "Regency",
]

# Detailed prompts for each architectural style to aid zero-shot accuracy
STYLE_PROMPTS = {
    "Victorian": (
        "a Victorian style residential property with ornate detailing, bay windows, "
        "decorative brickwork, slate roof, sash windows, and period features from the 1837-1901 era"
    ),
    "Edwardian": (
        "an Edwardian style residential property with wide frontage, larger windows, "
        "decorative woodwork, red brick, front garden, and features from the 1901-1910 era"
    ),
    "Art Deco": (
        "an Art Deco style residential property with geometric forms, curved walls, "
        "Crittall steel windows, streamlined design, and features from the 1920s-1930s era"
    ),
    "Mid-Century": (
        "a mid-century modern residential property with clean lines, large plate glass windows, "
        "flat or low-pitched roof, open plan layout, and features from the 1945-1969 era"
    ),
    "Contemporary": (
        "a contemporary modern residential property with minimalist design, large glazing, "
        "flat roof, modern materials, clean geometric forms, and current architectural style"
    ),
    "New Build": (
        "a newly built residential property by a housing developer with standard modern layout, "
        "uPVC windows, brick exterior, and typical new-build estate appearance"
    ),
    "Georgian": (
        "a Georgian style residential property with symmetrical facade, tall sash windows, "
        "grand proportions, classical columns, and features from the 1714-1837 era"
    ),
    "Brutalist": (
        "a Brutalist style residential building with raw exposed concrete, bold geometric shapes, "
        "repetitive angular forms, and features from the 1950s-1975 era"
    ),
    "Tudor": (
        "a Tudor style residential property with exposed timber framing, steeply pitched roof, "
        "tall ornate chimneys, leaded windows, and features from the medieval era"
    ),
    "Regency": (
        "a Regency style residential property with stucco facade, wrought iron balconies, "
        "elegant terraced layout, bow windows, and features from the 1811-1820 era"
    ),
}


async def classify_style(
    image: Image.Image, top_k: int = 3
) -> list[dict[str, Any]]:
    """Classify the architectural style of a property image.

    Uses CLIP zero-shot classification with detailed architectural prompts.

    Args:
        image: PIL Image of a property (ideally an exterior shot).
        top_k: Number of top predictions to return.

    Returns:
        List of top-k {label, confidence} dicts sorted by confidence descending.
    """
    if not clip_loader.is_loaded:
        await clip_loader.load()

    import torch

    prompts = list(STYLE_PROMPTS.values())
    labels = list(STYLE_PROMPTS.keys())

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
    top_results = results[:top_k]

    logger.info(
        "style_classified",
        top_style=top_results[0]["label"],
        top_confidence=top_results[0]["confidence"],
        top_k=top_k,
    )

    return top_results
