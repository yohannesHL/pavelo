"""
Natural Language Query Decomposition (S4-02)

Parses natural language property queries into structured search parameters
using OpenAI function calling / structured output.

Examples:
  "3 bed Victorian in Islington under 800k"
    → price_max=800000, bedrooms_min=3, style="Victorian", area="Islington"

  "family home with garden near good schools, budget 500-700k"
    → price_min=500000, price_max=700000, features=["garden"], style="family home"
"""

from __future__ import annotations

from typing import Any

import structlog
from pydantic import BaseModel, Field

from src.config import settings

logger = structlog.get_logger()


class DecomposedQuery(BaseModel):
    """Structured search parameters extracted from natural language."""

    original_query: str = Field(description="The original user query")
    semantic_query: str = Field(
        description="Cleaned semantic query for dense embedding search"
    )
    min_price: int | None = Field(None, description="Minimum price in GBP")
    max_price: int | None = Field(None, description="Maximum price in GBP")
    min_bedrooms: int | None = Field(None, description="Minimum number of bedrooms")
    max_bedrooms: int | None = Field(None, description="Maximum number of bedrooms")
    property_type: str | None = Field(
        None,
        description="Property type: detached, semi_detached, terraced, flat, bungalow, cottage, mansion",
    )
    area: str | None = Field(None, description="Area, neighbourhood, or city name")
    postcode: str | None = Field(None, description="UK postcode or postcode prefix")
    architectural_style: str | None = Field(
        None, description="Architectural style: Victorian, Edwardian, Georgian, Art Deco, Modern, etc."
    )
    era: str | None = Field(
        None, description="Property era: pre-1900, 1900-1930, 1930-1960, 1960-1990, 1990-2010, post-2010"
    )
    features: list[str] = Field(
        default_factory=list,
        description="Desired features: garden, parking, garage, open plan, period features, etc.",
    )
    status: str | None = Field(
        None, description="Listing status: for_sale, under_offer, sold_stc"
    )
    sort_preference: str | None = Field(
        None, description="Sort preference: cheapest, most_expensive, newest, largest"
    )


# OpenAI function schema for structured extraction
DECOMPOSE_FUNCTION = {
    "name": "decompose_property_query",
    "description": "Parse a natural language property search query into structured search parameters",
    "parameters": {
        "type": "object",
        "properties": {
            "semantic_query": {
                "type": "string",
                "description": "The cleaned query optimised for semantic search (keeps intent, removes numbers/prices)",
            },
            "min_price": {
                "type": "integer",
                "description": "Minimum price in GBP. Convert shorthand: 500k=500000, 1m=1000000, 1.5m=1500000",
            },
            "max_price": {
                "type": "integer",
                "description": "Maximum price in GBP. 'under 800k' means max_price=800000",
            },
            "min_bedrooms": {
                "type": "integer",
                "description": "Minimum bedrooms. '3 bed' means min_bedrooms=3",
            },
            "max_bedrooms": {
                "type": "integer",
                "description": "Maximum bedrooms",
            },
            "property_type": {
                "type": "string",
                "enum": [
                    "detached",
                    "semi_detached",
                    "terraced",
                    "flat",
                    "bungalow",
                    "cottage",
                    "mansion",
                ],
                "description": "Property type",
            },
            "area": {
                "type": "string",
                "description": "Area, neighbourhood, or city. e.g. 'Islington', 'Chelsea', 'Manchester'",
            },
            "postcode": {
                "type": "string",
                "description": "UK postcode or postcode prefix. e.g. 'N1', 'SW3', 'M1 4BT'",
            },
            "architectural_style": {
                "type": "string",
                "description": "Architectural style: Victorian, Edwardian, Georgian, Art Deco, Modern, Contemporary, etc.",
            },
            "era": {
                "type": "string",
                "enum": [
                    "pre-1900",
                    "1900-1930",
                    "1930-1960",
                    "1960-1990",
                    "1990-2010",
                    "post-2010",
                ],
                "description": "Property era/period",
            },
            "features": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Desired property features",
            },
            "status": {
                "type": "string",
                "enum": ["for_sale", "under_offer", "sold_stc"],
                "description": "Listing status filter",
            },
            "sort_preference": {
                "type": "string",
                "enum": ["cheapest", "most_expensive", "newest", "largest"],
                "description": "How to sort results",
            },
        },
        "required": ["semantic_query"],
    },
}


async def decompose_query(query: str) -> DecomposedQuery:
    """Decompose a natural language query into structured search parameters.

    Uses OpenAI function calling to extract structured fields from
    free-text property search queries.

    Args:
        query: Natural language query, e.g. "3 bed Victorian in Islington under 800k"

    Returns:
        DecomposedQuery with structured params and semantic query.
    """
    import json
    from openai import AsyncOpenAI

    logger.info("decompose_query_start", query=query[:200])

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    system_prompt = """You are a UK property search query parser. Extract structured search parameters from natural language property queries.

Rules:
- Convert price shorthand: "500k" → 500000, "1.5m" → 1500000, "under 800k" → max_price=800000
- "3 bed" means min_bedrooms=3 (user wants AT LEAST 3 bedrooms)
- Map property types: "house" → "detached", "terrace" → "terraced", "apartment" → "flat"
- The semantic_query should be a clean version optimised for embedding search — keep descriptive intent, remove explicit numbers
- Extract location names (city, neighbourhood, area) into the area field
- UK postcodes or prefixes go into the postcode field
- Features like "garden", "parking", "garage", "period features" go into features array
- Architectural styles: Victorian, Edwardian, Georgian, Art Deco, Modern, Contemporary, etc.
"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query},
            ],
            functions=[DECOMPOSE_FUNCTION],
            function_call={"name": "decompose_property_query"},
            temperature=0,
        )

        fn_call = response.choices[0].message.function_call
        if fn_call and fn_call.arguments:
            params = json.loads(fn_call.arguments)
        else:
            params = {"semantic_query": query}

        result = DecomposedQuery(
            original_query=query,
            semantic_query=params.get("semantic_query", query),
            min_price=params.get("min_price"),
            max_price=params.get("max_price"),
            min_bedrooms=params.get("min_bedrooms"),
            max_bedrooms=params.get("max_bedrooms"),
            property_type=params.get("property_type"),
            area=params.get("area"),
            postcode=params.get("postcode"),
            architectural_style=params.get("architectural_style"),
            era=params.get("era"),
            features=params.get("features", []),
            status=params.get("status"),
            sort_preference=params.get("sort_preference"),
        )

        logger.info(
            "decompose_query_success",
            semantic_query=result.semantic_query[:100],
            filters_extracted={
                k: v
                for k, v in result.model_dump().items()
                if v is not None and k not in ("original_query", "semantic_query")
                and v != []
            },
        )

        return result

    except Exception as e:
        logger.error("decompose_query_error", error=str(e), query=query[:200])
        # Fallback: return query as-is for dense-only search
        return DecomposedQuery(
            original_query=query,
            semantic_query=query,
        )
