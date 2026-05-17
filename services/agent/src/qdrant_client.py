"""Qdrant client wrapper for Pavelo services.

Lightweight client configuration — collections and indexing
logic will be added in Sprint 4.
"""

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from src.config import settings


def get_qdrant_client() -> QdrantClient:
    """Create and return a configured Qdrant client.

    Returns:
        QdrantClient: Configured client instance.
    """
    return QdrantClient(
        url=settings.qdrant_url,
        timeout=30,
    )


# Default vector configurations for future use
VECTOR_CONFIGS = {
    "text_embedding": VectorParams(
        size=3072,  # OpenAI text-embedding-3-large
        distance=Distance.COSINE,
    ),
    "image_embedding": VectorParams(
        size=768,  # CLIP ViT-L/14
        distance=Distance.COSINE,
    ),
}
