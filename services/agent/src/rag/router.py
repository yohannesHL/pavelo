"""RAG API endpoints — ingest and search."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import os

import structlog

from src.rag.ingest import ingest_property, ingest_batch
from src.rag.retrieve import search_properties, get_context_for_query

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/rag", tags=["RAG"])


class IngestRequest(BaseModel):
    """Single property ingestion request."""
    property_data: dict


class BatchIngestRequest(BaseModel):
    """Batch property ingestion request."""
    properties: list[dict]


class SearchRequest(BaseModel):
    """Semantic search request."""
    query: str
    limit: int = 5
    min_score: float = 0.3
    filters: Optional[dict] = None


@router.post("/ingest")
async def ingest_endpoint(request: IngestRequest):
    """Ingest a single property into the RAG pipeline.
    
    Triggered manually or by property create/update webhook.
    """
    try:
        result = await ingest_property(request.property_data)
        return result
    except Exception as e:
        logger.error("rag_ingest_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.post("/ingest/batch")
async def batch_ingest_endpoint(request: BatchIngestRequest):
    """Ingest multiple properties at once."""
    try:
        result = await ingest_batch(request.properties)
        return result
    except Exception as e:
        logger.error("rag_batch_ingest_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Batch ingestion failed: {str(e)}")


@router.post("/search")
async def search_endpoint(request: SearchRequest):
    """Semantic search over property embeddings."""
    try:
        results = await search_properties(
            query=request.query,
            limit=request.limit,
            min_score=request.min_score,
            filters=request.filters,
        )
        return {"query": request.query, "results": results, "count": len(results)}
    except Exception as e:
        logger.error("rag_search_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/ingest/from-file")
async def ingest_from_file():
    """Ingest properties from the scraped Rightmove JSON file.
    
    Looks for scripts/output/rightmove-listings.json
    """
    file_path = os.path.join(os.path.dirname(__file__), "../../../..", "scripts/output/rightmove-listings.json")
    alt_path = os.path.join(os.getcwd(), "scripts/output/rightmove-listings.json")
    
    target = file_path if os.path.exists(file_path) else alt_path
    
    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail="No scraped listings file found. Run the scraper first.")
    
    with open(target) as f:
        properties = json.load(f)
    
    result = await ingest_batch(properties)
    return result


@router.get("/stats")
async def stats_endpoint():
    """Get RAG pipeline statistics."""
    from src.qdrant_client import get_qdrant_client
    from src.rag.ingest import COLLECTION_NAME
    
    try:
        client = get_qdrant_client()
        info = client.get_collection(COLLECTION_NAME)
        return {
            "collection": COLLECTION_NAME,
            "points_count": info.points_count,
            "vectors_count": info.vectors_count,
            "status": info.status.value,
        }
    except Exception:
        return {"collection": COLLECTION_NAME, "points_count": 0, "status": "not_created"}
