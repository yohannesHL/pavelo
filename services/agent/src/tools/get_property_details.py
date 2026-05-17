"""
get_property_details — Fetch full property record from DB via API (S5-05)
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from langchain_core.tools import tool

from src.config import settings

logger = structlog.get_logger()

API_URL = settings.api_gateway_url


async def get_property_details_impl(property_id: str) -> dict[str, Any]:
    """Fetch full property details from the API.

    Args:
        property_id: UUID of the property.

    Returns:
        Property data dictionary.
    """
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                f"{API_URL}/trpc/property.get",
                params={"input": f'{{"id":"{property_id}"}}'},
            )
            response.raise_for_status()
            data = response.json()
            result = data.get("result", {}).get("data", {})

            if not result:
                return {"status": "error", "message": "Property not found"}

            return {
                "status": "success",
                "property": {
                    "id": result.get("id"),
                    "title": result.get("title"),
                    "description": result.get("description"),
                    "price": result.get("price"),
                    "propertyType": result.get("propertyType"),
                    "status": result.get("status"),
                    "bedrooms": result.get("bedrooms"),
                    "bathrooms": result.get("bathrooms"),
                    "squareFeet": result.get("squareFeet"),
                    "yearBuilt": result.get("yearBuilt"),
                    "address": f"{result.get('addressLine1', '')}, {result.get('city', '')}, {result.get('postcode', '')}",
                    "city": result.get("city"),
                    "postcode": result.get("postcode"),
                    "features": result.get("features", []),
                    "images": result.get("images", []),
                    "epcRating": result.get("epcRating"),
                    "tenure": result.get("tenure"),
                    "councilTaxBand": result.get("councilTaxBand"),
                },
            }

    except httpx.HTTPStatusError as e:
        logger.error("get_property_details_http_error", error=str(e))
        return {"status": "error", "message": f"HTTP error: {e.response.status_code}"}
    except Exception as e:
        logger.error("get_property_details_error", error=str(e))
        return {"status": "error", "message": str(e)}


@tool
async def get_property_details(property_id: str) -> str:
    """Get full details for a specific property by its ID.

    Use this when the user asks for more information about a specific property.

    Args:
        property_id: The UUID of the property to look up.

    Returns:
        JSON string with full property details.
    """
    import json
    result = await get_property_details_impl(property_id)
    return json.dumps(result, indent=2)
