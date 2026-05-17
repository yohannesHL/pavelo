"""
search_properties LangGraph Tool (S4-03)

Structured tool for property search within the LangGraph agent.
Combines query decomposition with Qdrant hybrid search.

Flow:
  1. Receive structured or natural language query
  2. Decompose NL query → structured params
  3. Call ML service hybrid search
  4. Dedup against properties_shown in agent state
  5. Return ranked results with scores
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from langchain_core.tools import tool
from pydantic import BaseModel, Field

from src.config import settings
from src.search.query_decompose import DecomposedQuery, decompose_query

logger = structlog.get_logger()

# ML service base URL
ML_SERVICE_URL = f"http://localhost:{8001}"


class SearchPropertiesInput(BaseModel):
    """Input schema for the search_properties tool."""

    query: str = Field(
        description="Natural language property search query"
    )
    min_price: int | None = Field(None, description="Minimum price in GBP")
    max_price: int | None = Field(None, description="Maximum price in GBP")
    min_bedrooms: int | None = Field(None, description="Minimum bedrooms")
    max_bedrooms: int | None = Field(None, description="Maximum bedrooms")
    property_type: str | None = Field(None, description="Property type filter")
    area: str | None = Field(None, description="Area or city name")
    postcode: str | None = Field(None, description="UK postcode or prefix")
    top_k: int = Field(10, description="Number of results to return")
    exclude_ids: list[str] = Field(
        default_factory=list,
        description="Property IDs already shown to the user",
    )


class SearchPropertyResult(BaseModel):
    """Single property result from search."""

    id: str
    score: float
    title: str = ""
    price: int = 0
    bedrooms: int = 0
    bathrooms: int = 0
    property_type: str = ""
    city: str = ""
    postcode: str = ""
    features: list[str] = []
    square_feet: int | None = None


class SearchPropertiesOutput(BaseModel):
    """Output from search_properties tool."""

    results: list[SearchPropertyResult]
    total_found: int
    query_used: str
    decomposed: dict[str, Any] = {}


async def _call_hybrid_search(
    query: str,
    decomposed: DecomposedQuery,
    input_data: SearchPropertiesInput,
) -> list[dict[str, Any]]:
    """Call the ML service hybrid search endpoint.

    Merges decomposed NL params with any explicit filter overrides.
    """
    # Build filters — explicit inputs override decomposed values
    filters = {
        "min_price": input_data.min_price or decomposed.min_price,
        "max_price": input_data.max_price or decomposed.max_price,
        "min_bedrooms": input_data.min_bedrooms or decomposed.min_bedrooms,
        "max_bedrooms": input_data.max_bedrooms or decomposed.max_bedrooms,
        "property_type": input_data.property_type or decomposed.property_type,
        "city": input_data.area or decomposed.area,
        "postcode": input_data.postcode or decomposed.postcode,
        "status": decomposed.status or "for_sale",
    }

    # Remove None values
    filters = {k: v for k, v in filters.items() if v is not None}

    request_body = {
        "query": decomposed.semantic_query,
        "filters": filters if filters else None,
        "top_k": input_data.top_k,
        "exclude_ids": input_data.exclude_ids or None,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{ML_SERVICE_URL}/api/v1/search/hybrid",
                json=request_body,
            )
            response.raise_for_status()
            return response.json().get("results", [])

    except httpx.HTTPError as e:
        logger.error("ml_search_http_error", error=str(e))
        return []
    except Exception as e:
        logger.error("ml_search_error", error=str(e))
        return []


async def search_properties_impl(
    input_data: SearchPropertiesInput,
) -> SearchPropertiesOutput:
    """Implementation of the search_properties tool.

    Steps:
    1. Decompose NL query into structured params
    2. Call hybrid search with merged filters
    3. Format results
    4. Return with metadata
    """
    logger.info(
        "search_properties_start",
        query=input_data.query[:200],
        explicit_filters={
            k: v for k, v in input_data.model_dump().items()
            if v is not None and k not in ("query", "top_k", "exclude_ids")
            and v != []
        },
    )

    # Step 1: Decompose query
    decomposed = await decompose_query(input_data.query)

    # Step 2: Call hybrid search
    raw_results = await _call_hybrid_search(
        query=input_data.query,
        decomposed=decomposed,
        input_data=input_data,
    )

    # Step 3: Format results
    results = []
    for r in raw_results:
        payload = r.get("payload", {})
        results.append(
            SearchPropertyResult(
                id=r.get("id", ""),
                score=r.get("score", 0.0),
                title=payload.get("title", ""),
                price=payload.get("price", 0),
                bedrooms=payload.get("bedrooms", 0),
                bathrooms=payload.get("bathrooms", 0),
                property_type=payload.get("propertyType", ""),
                city=payload.get("city", ""),
                postcode=payload.get("postcode", ""),
                features=payload.get("features", []),
                square_feet=payload.get("squareFeet"),
            )
        )

    # Step 4: Build decomposed info for transparency
    decomposed_info = {
        k: v
        for k, v in decomposed.model_dump().items()
        if v is not None and k not in ("original_query",) and v != []
    }

    logger.info(
        "search_properties_complete",
        results_count=len(results),
        query=input_data.query[:100],
    )

    return SearchPropertiesOutput(
        results=results,
        total_found=len(results),
        query_used=decomposed.semantic_query,
        decomposed=decomposed_info,
    )


@tool
async def search_properties(
    query: str,
    min_price: int | None = None,
    max_price: int | None = None,
    min_bedrooms: int | None = None,
    max_bedrooms: int | None = None,
    property_type: str | None = None,
    area: str | None = None,
    postcode: str | None = None,
    top_k: int = 10,
) -> str:
    """Search for properties using natural language and optional filters.

    Use this tool when the user wants to find properties. The query
    will be decomposed into structured search parameters automatically.

    Args:
        query: Natural language description of what the user is looking for.
        min_price: Optional minimum price in GBP.
        max_price: Optional maximum price in GBP.
        min_bedrooms: Optional minimum number of bedrooms.
        max_bedrooms: Optional maximum number of bedrooms.
        property_type: Optional property type (detached, terraced, flat, etc).
        area: Optional area or city name.
        postcode: Optional UK postcode or prefix.
        top_k: Number of results to return (default 10).

    Returns:
        JSON string with search results.
    """
    input_data = SearchPropertiesInput(
        query=query,
        min_price=min_price,
        max_price=max_price,
        min_bedrooms=min_bedrooms,
        max_bedrooms=max_bedrooms,
        property_type=property_type,
        area=area,
        postcode=postcode,
        top_k=top_k,
    )

    output = await search_properties_impl(input_data)
    return output.model_dump_json(indent=2)
