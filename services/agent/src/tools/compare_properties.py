"""
compare_properties — Side-by-side comparison of 2-4 properties (S5-05)
"""

from __future__ import annotations

import json
from typing import Any

import httpx
import structlog
from langchain_core.tools import tool

from src.config import settings
from src.tools.get_property_details import get_property_details_impl

logger = structlog.get_logger()


async def compare_properties_impl(
    property_ids: list[str],
) -> dict[str, Any]:
    """Compare 2-4 properties side by side.

    Args:
        property_ids: List of property UUIDs to compare (2-4).

    Returns:
        Structured comparison data.
    """
    if len(property_ids) < 2:
        return {"status": "error", "message": "Need at least 2 properties to compare"}
    if len(property_ids) > 4:
        property_ids = property_ids[:4]

    properties = []
    for pid in property_ids:
        result = await get_property_details_impl(pid)
        if result.get("status") == "success":
            properties.append(result["property"])

    if len(properties) < 2:
        return {"status": "error", "message": "Could not fetch enough properties for comparison"}

    # Build comparison summary
    comparison = {
        "properties": properties,
        "summary": {
            "price_range": {
                "min": min(p.get("price", 0) for p in properties),
                "max": max(p.get("price", 0) for p in properties),
            },
            "bedrooms_range": {
                "min": min(p.get("bedrooms", 0) for p in properties),
                "max": max(p.get("bedrooms", 0) for p in properties),
            },
            "best_value": None,
        },
    }

    # Calculate price per sqft if available
    for p in properties:
        sqft = p.get("squareFeet")
        price = p.get("price", 0)
        if sqft and sqft > 0:
            p["pricePerSqFt"] = round(price / sqft)

    # Find best value (lowest price/sqft)
    props_with_ppf = [p for p in properties if p.get("pricePerSqFt")]
    if props_with_ppf:
        best = min(props_with_ppf, key=lambda p: p["pricePerSqFt"])
        comparison["summary"]["best_value"] = best.get("title")

    return {"status": "success", "comparison": comparison}


@tool
async def compare_properties(property_ids: list[str]) -> str:
    """Compare 2-4 properties side by side.

    Use this when the user wants to compare specific properties they've seen.

    Args:
        property_ids: List of 2-4 property UUIDs to compare.

    Returns:
        JSON string with comparison data.
    """
    result = await compare_properties_impl(property_ids)
    return json.dumps(result, indent=2, default=str)
