"""
CLIP Embedding Routes (S3-01)

POST /api/v1/clip/embed — Generate CLIP embeddings for images.
Supports both single image and batch inference via multipart upload or URL list.
"""

from __future__ import annotations

import io
from typing import Any

import structlog
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel, Field

from src.models.clip import clip_loader

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/clip", tags=["clip"])


class EmbedURLRequest(BaseModel):
    """Request body for URL-based embedding."""
    urls: list[str] = Field(..., min_length=1, max_length=32, description="Image URLs to embed")


class EmbeddingResult(BaseModel):
    """Single embedding result."""
    index: int
    embedding: list[float]
    dimensions: int


class EmbedResponse(BaseModel):
    """Response for embedding requests."""
    embeddings: list[EmbeddingResult]
    model: str = "ViT-L/14"
    count: int


@router.post("/embed", response_model=EmbedResponse)
async def embed_images_upload(files: list[UploadFile] = File(...)):
    """Generate CLIP embeddings from uploaded image files.

    Accepts up to 32 images via multipart upload.
    Returns 768-dimensional embedding vectors for each image.
    """
    if len(files) > 32:
        raise HTTPException(status_code=400, detail="Maximum 32 images per request")

    try:
        if not clip_loader.is_loaded:
            await clip_loader.load()

        from PIL import Image

        images = []
        for f in files:
            content = await f.read()
            img = Image.open(io.BytesIO(content)).convert("RGB")
            images.append(img)

        embeddings = await clip_loader.embed_images(images)

        results = [
            EmbeddingResult(index=i, embedding=emb, dimensions=len(emb))
            for i, emb in enumerate(embeddings)
        ]

        return EmbedResponse(embeddings=results, count=len(results))

    except Exception as e:
        logger.error("embed_upload_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")


@router.post("/embed/url", response_model=EmbedResponse)
async def embed_images_url(request: EmbedURLRequest):
    """Generate CLIP embeddings from image URLs.

    Accepts up to 32 image URLs.
    Downloads each image and returns 768-dimensional embeddings.
    """
    try:
        if not clip_loader.is_loaded:
            await clip_loader.load()

        import httpx
        from PIL import Image

        images = []
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            for url in request.urls:
                resp = await client.get(url)
                resp.raise_for_status()
                img = Image.open(io.BytesIO(resp.content)).convert("RGB")
                images.append(img)

        embeddings = await clip_loader.embed_images(images)

        results = [
            EmbeddingResult(index=i, embedding=emb, dimensions=len(emb))
            for i, emb in enumerate(embeddings)
        ]

        return EmbedResponse(embeddings=results, count=len(results))

    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Image download failed: {str(e)}")
    except Exception as e:
        logger.error("embed_url_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")
