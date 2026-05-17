"""
Property Embedding Pipeline (S2-08)

Generates text embeddings for property listings and upserts them
to Qdrant for hybrid semantic + keyword search.

Pipeline:
1. Synthesise a rich text description from property attributes.
2. Generate a dense embedding via OpenAI text-embedding-3-large.
3. Upsert to Qdrant with structured payload for filtering.
"""

from __future__ import annotations

from typing import Any

import structlog

from src.config import settings

logger = structlog.get_logger()


def synthesise_description(property_data: dict[str, Any]) -> str:
    """Generate a rich text description from property attributes.

    Combines structured data into natural language that embeds well.
    This text is what gets embedded — not just the raw description.

    Args:
        property_data: Property dictionary with all attributes.

    Returns:
        Synthesised text description optimised for embedding.
    """
    parts: list[str] = []

    # Title and type
    title = property_data.get("title", "")
    prop_type = property_data.get("propertyType", "property").replace("_", " ")
    parts.append(f"{title}. A {prop_type}")

    # Bedrooms and bathrooms
    beds = property_data.get("bedrooms", 0)
    baths = property_data.get("bathrooms", 0)
    if beds or baths:
        parts.append(f"with {beds} bedroom{'s' if beds != 1 else ''} and {baths} bathroom{'s' if baths != 1 else ''}")

    # Size
    sqft = property_data.get("squareFeet")
    if sqft:
        parts.append(f"spanning {sqft} square feet")

    # Year built
    year = property_data.get("yearBuilt")
    if year:
        parts.append(f"built in {year}")

    # Location
    address = property_data.get("address", {})
    city = address.get("city", property_data.get("city", ""))
    postcode = address.get("postcode", property_data.get("postcode", ""))
    if city:
        parts.append(f"located in {city}")
    if postcode:
        parts.append(f"({postcode})")

    # Price
    price = property_data.get("price")
    if price:
        parts.append(f"priced at £{price:,}")

    # Join the main description
    main_desc = " ".join(parts) + "."

    # Features
    features = property_data.get("features", [])
    if features:
        main_desc += f" Features include: {', '.join(features)}."

    # Original description
    desc = property_data.get("description", "")
    if desc:
        main_desc += f" {desc}"

    # Tenure and EPC
    tenure = property_data.get("tenure")
    epc = property_data.get("epcRating")
    extras = []
    if tenure:
        extras.append(f"{tenure} tenure")
    if epc:
        extras.append(f"EPC rating {epc}")
    if extras:
        main_desc += f" {', '.join(extras).capitalize()}."

    return main_desc.strip()


async def generate_embedding(text: str) -> list[float]:
    """Generate a dense embedding using OpenAI text-embedding-3-large.

    Args:
        text: Input text to embed.

    Returns:
        Embedding vector (3072 dimensions).
    """
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    response = await client.embeddings.create(
        model=settings.text_embedding_model,
        input=text,
        dimensions=settings.text_embedding_dimensions,
    )

    embedding = response.data[0].embedding
    logger.info(
        "embedding_generated",
        model=settings.text_embedding_model,
        dimensions=len(embedding),
        text_length=len(text),
    )

    return embedding


async def upsert_property_embedding(
    property_id: str,
    embedding: list[float],
    payload: dict[str, Any],
) -> bool:
    """Upsert a property embedding to Qdrant.

    Args:
        property_id: UUID of the property.
        embedding: Dense embedding vector.
        payload: Structured payload for filtering (price, beds, etc).

    Returns:
        True if upserted successfully.
    """
    from qdrant_client import QdrantClient
    from qdrant_client.models import PointStruct

    try:
        client = QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key or None,
        )

        point = PointStruct(
            id=property_id,
            vector={"text": embedding},
            payload=payload,
        )

        client.upsert(
            collection_name=settings.property_collection,
            points=[point],
        )

        logger.info("qdrant_upsert_success", property_id=property_id)
        return True
    except Exception as e:
        logger.error("qdrant_upsert_error", error=str(e), property_id=property_id)
        return False


def build_qdrant_payload(property_data: dict[str, Any]) -> dict[str, Any]:
    """Build a structured payload for Qdrant point storage.

    This payload enables server-side filtering on structured fields
    while the vector enables semantic search.

    Args:
        property_data: Full property dictionary.

    Returns:
        Flat payload dict for Qdrant.
    """
    address = property_data.get("address", {})

    return {
        "title": property_data.get("title", ""),
        "price": property_data.get("price", 0),
        "propertyType": property_data.get("propertyType", ""),
        "status": property_data.get("status", ""),
        "bedrooms": property_data.get("bedrooms", 0),
        "bathrooms": property_data.get("bathrooms", 0),
        "squareFeet": property_data.get("squareFeet"),
        "yearBuilt": property_data.get("yearBuilt"),
        "city": address.get("city", property_data.get("city", "")),
        "postcode": address.get("postcode", property_data.get("postcode", "")),
        "county": address.get("county", property_data.get("county", "")),
        "features": property_data.get("features", []),
        "tenure": property_data.get("tenure"),
        "epcRating": property_data.get("epcRating"),
        "latitude": property_data.get("latitude"),
        "longitude": property_data.get("longitude"),
        "ownerId": property_data.get("ownerId", ""),
    }


async def embed_property(property_data: dict[str, Any]) -> bool:
    """Full pipeline: synthesise → embed → upsert for a single property.

    Args:
        property_data: Complete property dictionary.

    Returns:
        True if the full pipeline succeeded.
    """
    property_id = property_data.get("id", "")
    if not property_id:
        logger.error("embed_property_missing_id")
        return False

    # Step 1: Synthesise description
    text = synthesise_description(property_data)
    logger.info(
        "description_synthesised",
        property_id=property_id,
        text_length=len(text),
    )

    # Step 2: Generate embedding
    try:
        embedding = await generate_embedding(text)
    except Exception as e:
        logger.error(
            "embedding_generation_failed",
            property_id=property_id,
            error=str(e),
        )
        return False

    # Step 3: Build payload and upsert
    payload = build_qdrant_payload(property_data)
    payload["synthesised_text"] = text  # Store for BM25 sparse indexing

    return await upsert_property_embedding(property_id, embedding, payload)


async def batch_embed_properties(
    properties: list[dict[str, Any]],
    batch_size: int = 10,
) -> dict[str, int]:
    """Batch process multiple properties through the embedding pipeline.

    Args:
        properties: List of property dictionaries.
        batch_size: Number of properties to process concurrently.

    Returns:
        Summary dict with success/failure counts.
    """
    import asyncio

    success = 0
    failed = 0

    for i in range(0, len(properties), batch_size):
        batch = properties[i : i + batch_size]
        results = await asyncio.gather(
            *[embed_property(p) for p in batch],
            return_exceptions=True,
        )
        for result in results:
            if result is True:
                success += 1
            else:
                failed += 1

        logger.info(
            "batch_progress",
            processed=i + len(batch),
            total=len(properties),
            success=success,
            failed=failed,
        )

    return {"success": success, "failed": failed, "total": len(properties)}
