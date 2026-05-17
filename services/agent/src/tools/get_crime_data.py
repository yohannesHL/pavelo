"""
get_crime_data — Fetch crime data via Police UK API wrapper (S7-10)

Calls Police UK wrapper on the Node API, returns crime data,
emits crime_map visual payload for the frontend.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from langchain_core.tools import tool

from src.config import settings

logger = structlog.get_logger()

API_URL = settings.api_gateway_url


async def get_crime_data_impl(
    lat: float,
    lng: float,
    months: int = 3,
) -> dict[str, Any]:
    """Fetch crime data from the intelligence API.

    Returns crime records, category breakdown, and map data.
    """
    try:
        import json

        params = json.dumps({"lat": lat, "lng": lng, "months": months})

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{API_URL}/trpc/intelligence.crime",
                params={"input": params},
            )
            response.raise_for_status()
            data = response.json()
            result = data.get("result", {}).get("data", {})

            if not result:
                return {"status": "error", "message": "No crime data available"}

            # Build visual payload
            visual_payload = {
                "type": "crime_map",
                "data": {
                    "crimes": result.get("crimes", []),
                    "categories": result.get("categories", []),
                    "center": result.get("center", {"lat": lat, "lng": lng}),
                    "dateRange": result.get("dateRange", {}),
                    "total": result.get("total", 0),
                },
                "title": "Crime Map",
            }

            # Format text response
            total = result.get("total", 0)
            categories = result.get("categories", [])
            date_range = result.get("dateRange", {})

            top_categories = categories[:5]
            cat_lines = "\n".join(
                f"• {c.get('label', c.get('category', ''))}: {c.get('count', 0)}"
                for c in top_categories
            )

            summary = (
                f"**Crime Data ({date_range.get('from', '')} to {date_range.get('to', '')})**\n\n"
                f"Total incidents: {total}\n\n"
                f"**Top categories:**\n{cat_lines}\n"
            )

            return {
                "status": "ok",
                "summary": summary,
                "visual_payload": visual_payload,
                "total": total,
            }

    except httpx.HTTPError as e:
        logger.error("crime_data_http_error", error=str(e))
        return {"status": "error", "message": f"Failed to fetch crime data: {e}"}
    except Exception as e:
        logger.error("crime_data_error", error=str(e))
        return {"status": "error", "message": str(e)}


@tool
async def get_crime_data(
    lat: float,
    lng: float,
    months: int = 3,
) -> str:
    """Get crime data for an area including category breakdown and map.

    Use this tool when the user asks about safety, crime rates,
    or crime statistics for a specific location.

    Args:
        lat: Latitude of the location.
        lng: Longitude of the location.
        months: Number of months to look back (1-12, default 3).

    Returns:
        JSON string with crime data and visual payload.
    """
    import json

    result = await get_crime_data_impl(lat, lng, months)
    return json.dumps(result, indent=2, default=str)
