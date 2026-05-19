"""RAG retrieval — semantic search over property embeddings."""

import structlog
from typing import Optional

from src.qdrant_client import get_qdrant_client
from src.rag.ingest import _embed_text, COLLECTION_NAME, _ensure_collection

logger = structlog.get_logger()


async def search_properties(
    query: str,
    limit: int = 5,
    min_score: float = 0.3,
    filters: Optional[dict] = None,
) -> list[dict]:
    """Semantic search over property embeddings.
    
    Args:
        query: Natural language search query
        limit: Max results to return
        min_score: Minimum cosine similarity threshold
        filters: Optional Qdrant filters (e.g., {"bedrooms": 3})
    
    Returns:
        List of matching property chunks with scores.
    """
    _ensure_collection()
    client = get_qdrant_client()
    
    query_embedding = await _embed_text(query)
    
    # Build Qdrant filter if provided
    qdrant_filter = None
    if filters:
        from qdrant_client.models import Filter, FieldCondition, MatchValue, Range
        conditions = []
        for key, value in filters.items():
            if isinstance(value, dict) and ("gte" in value or "lte" in value):
                conditions.append(FieldCondition(key=key, range=Range(**value)))
            else:
                conditions.append(FieldCondition(key=key, match=MatchValue(value=value)))
        qdrant_filter = Filter(must=conditions)
    
    results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_embedding,
        limit=limit,
        score_threshold=min_score,
        query_filter=qdrant_filter,
    )
    
    matches = []
    for result in results:
        matches.append({
            "score": result.score,
            "text": result.payload.get("text", ""),
            "property_id": result.payload.get("property_id", ""),
            "chunk_type": result.payload.get("chunk_type", ""),
            "address": result.payload.get("address", ""),
            "price": result.payload.get("price", 0),
            "bedrooms": result.payload.get("bedrooms", 0),
            "listing_url": result.payload.get("listing_url", ""),
        })
    
    logger.info("rag_search", query=query[:50], results=len(matches))
    return matches


async def get_context_for_query(query: str, limit: int = 3) -> str:
    """Get formatted context string for LLM augmentation.
    
    Used by the response generator to augment prompts with
    relevant property data from the vector store.
    """
    results = await search_properties(query, limit=limit)
    
    if not results:
        return ""
    
    context_parts = []
    for r in results:
        context_parts.append(f"[Property - {r['address']} | Score: {r['score']:.2f}]\n{r['text']}")
    
    return "\n\n---\n\n".join(context_parts)
