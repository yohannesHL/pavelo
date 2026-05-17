"""
Qdrant Collection Setup for Hybrid Search (S2-09)

Configures Qdrant collections for hybrid dense + sparse search:
- Dense vectors: OpenAI text-embedding-3-large (3072 dims, cosine)
- Sparse vectors: BM25 keyword index over property text fields
- Payload indexes: structured field filtering (price, beds, type, etc)

This enables the "hybrid search" pattern:
  query → [dense semantic search] + [BM25 keyword search] → RRF fusion → results
"""

from __future__ import annotations

from typing import Any

import structlog
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    SparseVectorParams,
    SparseIndexParams,
    PayloadSchemaType,
)

from src.config import settings

logger = structlog.get_logger()


def get_qdrant_client() -> QdrantClient:
    """Create a configured Qdrant client."""
    return QdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key or None,
        timeout=30,
    )


def setup_property_collection(client: QdrantClient | None = None) -> bool:
    """Create or verify the properties collection with hybrid search config.

    This sets up:
    - Dense vector "text": text-embedding-3-large (3072d, cosine)
    - Sparse vector "bm25": keyword/BM25 index for hybrid search
    - Payload indexes for structured filtering

    Args:
        client: Optional Qdrant client. Creates one if not provided.

    Returns:
        True if collection is ready.
    """
    if client is None:
        client = get_qdrant_client()

    collection_name = settings.property_collection

    try:
        # Check if collection exists
        collections = client.get_collections().collections
        exists = any(c.name == collection_name for c in collections)

        if exists:
            logger.info("collection_exists", name=collection_name)
            return True

        # Create collection with hybrid vectors
        client.create_collection(
            collection_name=collection_name,
            vectors_config={
                "text": VectorParams(
                    size=settings.text_embedding_dimensions,  # 3072
                    distance=Distance.COSINE,
                ),
            },
            sparse_vectors_config={
                "bm25": SparseVectorParams(
                    index=SparseIndexParams(
                        on_disk=False,
                    ),
                ),
            },
        )

        logger.info("collection_created", name=collection_name)

        # Create payload indexes for structured filtering
        _create_payload_indexes(client, collection_name)

        return True

    except Exception as e:
        logger.error("collection_setup_error", error=str(e))
        return False


def _create_payload_indexes(client: QdrantClient, collection_name: str) -> None:
    """Create payload field indexes for efficient filtering.

    These indexes allow Qdrant to filter results server-side
    before or after vector search, improving performance.
    """
    indexes: list[tuple[str, PayloadSchemaType]] = [
        ("price", PayloadSchemaType.INTEGER),
        ("bedrooms", PayloadSchemaType.INTEGER),
        ("bathrooms", PayloadSchemaType.INTEGER),
        ("propertyType", PayloadSchemaType.KEYWORD),
        ("status", PayloadSchemaType.KEYWORD),
        ("city", PayloadSchemaType.KEYWORD),
        ("postcode", PayloadSchemaType.KEYWORD),
        ("tenure", PayloadSchemaType.KEYWORD),
        ("ownerId", PayloadSchemaType.KEYWORD),
    ]

    for field_name, schema_type in indexes:
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name=field_name,
                field_schema=schema_type,
            )
            logger.info("payload_index_created", field=field_name, type=str(schema_type))
        except Exception as e:
            logger.warning(
                "payload_index_error",
                field=field_name,
                error=str(e),
            )


def generate_sparse_vector(text: str) -> dict[str, Any]:
    """Generate a sparse (BM25-style) vector from text.

    This is a simplified BM25 tokenisation. In production, use
    a proper BM25 implementation or Qdrant's built-in sparse encoder.

    Args:
        text: Input text to tokenise.

    Returns:
        Dict with 'indices' and 'values' for sparse vector.
    """
    # Simple whitespace tokenisation + term frequency
    # Production: use fastembed or Qdrant's built-in sparse encoder
    tokens = text.lower().split()
    token_freq: dict[str, int] = {}
    for token in tokens:
        # Basic cleanup
        clean = "".join(c for c in token if c.isalnum())
        if clean and len(clean) > 2:
            token_freq[clean] = token_freq.get(clean, 0) + 1

    # Map tokens to integer indices (simple hash)
    indices = []
    values = []
    for token, freq in token_freq.items():
        idx = hash(token) % (2**31)  # Positive int32 range
        indices.append(abs(idx))
        values.append(float(freq))

    return {"indices": indices, "values": values}


async def upsert_with_sparse(
    property_id: str,
    dense_embedding: list[float],
    sparse_text: str,
    payload: dict[str, Any],
) -> bool:
    """Upsert a property with both dense and sparse vectors.

    Args:
        property_id: Property UUID.
        dense_embedding: Dense vector from OpenAI.
        sparse_text: Text for BM25 sparse vector generation.
        payload: Structured payload for filtering.

    Returns:
        True if upserted successfully.
    """
    from qdrant_client.models import PointStruct, SparseVector

    try:
        client = get_qdrant_client()
        sparse = generate_sparse_vector(sparse_text)

        point = PointStruct(
            id=property_id,
            vector={
                "text": dense_embedding,
                "bm25": SparseVector(
                    indices=sparse["indices"],
                    values=sparse["values"],
                ),
            },
            payload=payload,
        )

        client.upsert(
            collection_name=settings.property_collection,
            points=[point],
        )

        logger.info(
            "hybrid_upsert_success",
            property_id=property_id,
            sparse_terms=len(sparse["indices"]),
        )
        return True
    except Exception as e:
        logger.error("hybrid_upsert_error", error=str(e), property_id=property_id)
        return False


def on_property_write_trigger(property_data: dict[str, Any]) -> None:
    """Trigger re-embedding when a property is created or updated.

    This function should be called by the API gateway after a
    property write operation. It enqueues an embedding job.

    In production, this would use a job queue (Celery/Redis).
    For now, it logs the trigger for future implementation.

    Args:
        property_data: The property that was written.
    """
    property_id = property_data.get("id", "unknown")
    logger.info(
        "reembed_trigger",
        property_id=property_id,
        hint="Job queue integration in Sprint 3 (S3-09)",
    )
    # TODO: Enqueue embed_property job via Celery/Redis (Sprint 3)
