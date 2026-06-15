"""Property ingestion pipeline — chunk and embed listings into Qdrant."""

import json
import hashlib
import uuid
from typing import Optional

import structlog
from qdrant_client.models import PointStruct, VectorParams, Distance

from src.config import settings
from src.qdrant_client import get_qdrant_client
from src.providers.factory import get_llm

logger = structlog.get_logger()

COLLECTION_NAME = "property_listings"
EMBEDDING_DIM = 1536  # OpenAI text-embedding-3-small / OpenRouter compatible


def _ensure_collection():
    """Create Qdrant collection if it doesn't exist."""
    client = get_qdrant_client()
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )
        logger.info("qdrant_collection_created", name=COLLECTION_NAME)


def _chunk_property(property_data: dict) -> list[dict]:
    """Create semantic chunks from a property listing.
    
    Chunking strategy:
    - Chunk 1: Overview (title, price, address, type, beds/baths)
    - Chunk 2: Full description
    - Chunk 3: Features list
    - Chunk 4: Location/area context
    
    Each chunk includes the property ID for retrieval.
    """
    property_id = property_data.get("id", str(uuid.uuid4()))
    
    chunks = []
    
    # Chunk 1: Overview
    overview = f"""Property: {property_data.get('title', 'Unknown')}
Price: {property_data.get('priceText', 'Unknown')} ({property_data.get('price', 0)})
Address: {property_data.get('address', 'Unknown')}
Type: {property_data.get('propertyType', 'Unknown')}
Bedrooms: {property_data.get('bedrooms', 0)}
Bathrooms: {property_data.get('bathrooms', 0)}
Agent: {property_data.get('agent', 'Unknown')}"""
    
    chunks.append({
        "text": overview,
        "chunk_type": "overview",
        "property_id": property_id,
    })
    
    # Chunk 2: Description
    description = property_data.get("description", "")
    if description and len(description) > 20:
        chunks.append({
            "text": f"Property at {property_data.get('address', 'Unknown')}:\n{description}",
            "chunk_type": "description",
            "property_id": property_id,
        })
    
    # Chunk 3: Features
    features = property_data.get("features", [])
    if features:
        features_text = f"Features of property at {property_data.get('address', 'Unknown')}:\n" + "\n".join(f"- {f}" for f in features)
        chunks.append({
            "text": features_text,
            "chunk_type": "features",
            "property_id": property_id,
        })
    
    # Chunk 4: Structured search-optimized
    search_text = f"""{property_data.get('bedrooms', 0)} bedroom {property_data.get('propertyType', 'property')} in {property_data.get('address', 'Unknown')} for {property_data.get('priceText', 'Unknown')}. {', '.join(features[:5]) if features else ''}"""
    chunks.append({
        "text": search_text,
        "chunk_type": "search_optimized",
        "property_id": property_id,
    })
    
    return chunks


async def _embed_text(text: str) -> list[float]:
    """Generate embedding for text using the configured LLM provider.
    
    Uses OpenAI-compatible embedding endpoint via provider factory.
    Falls back to a deterministic hash-based embedding for testing.
    """
    try:
        llm = get_llm()
        # Use the provider's underlying client for embeddings
        if hasattr(llm, 'client'):
            response = await llm.client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
            )
            return response.data[0].embedding
        else:
            # Fallback: hash-based deterministic embedding (for testing without API)
            return _hash_embedding(text)
    except Exception as e:
        logger.warning("embedding_fallback", error=str(e))
        return _hash_embedding(text)


def _hash_embedding(text: str) -> list[float]:
    """Deterministic hash-based embedding for testing without API keys."""
    h = hashlib.sha512(text.encode()).digest()
    # Expand to EMBEDDING_DIM floats between -1 and 1
    embedding = []
    for i in range(EMBEDDING_DIM):
        byte_idx = i % len(h)
        embedding.append((h[byte_idx] / 128.0) - 1.0)
    return embedding


async def ingest_property(property_data: dict) -> dict:
    """Ingest a single property into the RAG pipeline.
    
    Steps:
    1. Chunk the property data
    2. Generate embeddings for each chunk
    3. Upsert into Qdrant with metadata
    
    Returns:
        Dict with ingestion stats.
    """
    _ensure_collection()
    client = get_qdrant_client()
    
    property_id = property_data.get("id", str(uuid.uuid4()))
    chunks = _chunk_property(property_data)
    
    points = []
    for i, chunk in enumerate(chunks):
        embedding = await _embed_text(chunk["text"])
        
        point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{property_id}-{chunk['chunk_type']}"))
        
        points.append(PointStruct(
            id=point_id,
            vector=embedding,
            payload={
                "text": chunk["text"],
                "chunk_type": chunk["chunk_type"],
                "property_id": property_id,
                "address": property_data.get("address", ""),
                "price": property_data.get("price", 0),
                "bedrooms": property_data.get("bedrooms", 0),
                "property_type": property_data.get("propertyType", ""),
                "listing_url": property_data.get("listingUrl", ""),
            },
        ))
    
    # Upsert (idempotent)
    client.upsert(collection_name=COLLECTION_NAME, points=points)
    
    logger.info(
        "property_ingested",
        property_id=property_id,
        chunks=len(points),
        address=property_data.get("address", ""),
    )
    
    return {
        "property_id": property_id,
        "chunks_created": len(points),
        "status": "success",
    }


async def ingest_batch(properties: list[dict]) -> dict:
    """Ingest multiple properties into the RAG pipeline."""
    results = []
    for prop in properties:
        result = await ingest_property(prop)
        results.append(result)
    
    return {
        "total": len(properties),
        "ingested": len([r for r in results if r["status"] == "success"]),
        "results": results,
    }
