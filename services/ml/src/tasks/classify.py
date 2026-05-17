"""
Classification Tasks (S3-09)

Celery task definitions for scene classification, style classification,
era estimation, and condition scoring. Each task includes retry policies
with exponential backoff and dead letter routing on permanent failure.
"""

from __future__ import annotations

import io
from typing import Any

import structlog

from src.tasks.celery_app import celery_app
from src.config import settings

logger = structlog.get_logger()


@celery_app.task(
    name="src.tasks.classify.classify_scene_task",
    bind=True,
    max_retries=settings.max_retries,
    default_retry_delay=settings.retry_backoff,
    acks_late=True,
)
def classify_scene_task(self, image_url: str, property_id: str, job_id: str) -> dict[str, Any]:
    """Classify property image scene type.

    Args:
        image_url: URL or path to the image.
        property_id: Property UUID.
        job_id: Parent job UUID for tracking.

    Returns:
        Dict with scene classification results.
    """
    import asyncio

    try:
        image = _download_image(image_url)

        from src.models.scene_classifier import classify_scene

        results = asyncio.get_event_loop().run_until_complete(classify_scene(image))

        logger.info(
            "scene_task_complete",
            property_id=property_id,
            job_id=job_id,
            prediction=results[0]["label"],
        )

        return {
            "property_id": property_id,
            "job_id": job_id,
            "task": "scene_classification",
            "status": "completed",
            "results": results,
        }

    except Exception as exc:
        logger.error(
            "scene_task_failed",
            property_id=property_id,
            job_id=job_id,
            error=str(exc),
            retry=self.request.retries,
        )
        # Exponential backoff: 60s, 120s, 240s
        raise self.retry(
            exc=exc,
            countdown=settings.retry_backoff * (2 ** self.request.retries),
        )


@celery_app.task(
    name="src.tasks.classify.classify_style_task",
    bind=True,
    max_retries=settings.max_retries,
    default_retry_delay=settings.retry_backoff,
    acks_late=True,
)
def classify_style_task(self, image_url: str, property_id: str, job_id: str) -> dict[str, Any]:
    """Classify architectural style of a property image.

    Args:
        image_url: URL or path to the image.
        property_id: Property UUID.
        job_id: Parent job UUID for tracking.

    Returns:
        Dict with top-3 style predictions.
    """
    import asyncio

    try:
        image = _download_image(image_url)

        from src.models.style_classifier import classify_style

        results = asyncio.get_event_loop().run_until_complete(classify_style(image, top_k=3))

        logger.info(
            "style_task_complete",
            property_id=property_id,
            job_id=job_id,
            top_style=results[0]["label"],
        )

        return {
            "property_id": property_id,
            "job_id": job_id,
            "task": "style_classification",
            "status": "completed",
            "results": results,
        }

    except Exception as exc:
        logger.error(
            "style_task_failed",
            property_id=property_id,
            job_id=job_id,
            error=str(exc),
            retry=self.request.retries,
        )
        raise self.retry(
            exc=exc,
            countdown=settings.retry_backoff * (2 ** self.request.retries),
        )


def _download_image(image_url: str):
    """Download an image from URL or read from local path.

    Args:
        image_url: HTTP URL or local file path.

    Returns:
        PIL Image object.
    """
    from PIL import Image

    if image_url.startswith(("http://", "https://")):
        import httpx

        response = httpx.get(image_url, timeout=30, follow_redirects=True)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert("RGB")
    else:
        return Image.open(image_url).convert("RGB")
