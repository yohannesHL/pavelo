"""
get_area_stats — Fetch area demographics + deprivation data via API (S7-10)

Calls ONS wrapper on the Node API, returns demographics + scores,
emits area_dashboard visual payload for the frontend.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from langchain_core.tools import tool

from src.config import settings

logger = structlog.get_logger()

API_URL = settings.api_gateway_url


async def get_area_stats_impl(
    lat: float,
    lng: float,
    postcode: str,
) -> dict[str, Any]:
    """Fetch area statistics from the intelligence API.

    Returns demographics, deprivation index, and area scores.
    """
    try:
        import json

        params = json.dumps({"lat": lat, "lng": lng, "postcode": postcode})

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                f"{API_URL}/trpc/intelligence.areaStats",
                params={"input": params},
            )
            response.raise_for_status()
            data = response.json()
            result = data.get("result", {}).get("data", {})

            if not result:
                return {"status": "error", "message": "No area data available"}

            # Build visual payload
            visual_payload = {
                "type": "area_dashboard",
                "data": {
                    "demographics": result.get("demographics", {}),
                    "scores": result.get("scores", {}),
                    "postcode": postcode,
                },
                "title": f"Area Statistics — {postcode}",
            }

            # Format text response
            demographics = result.get("demographics", {})
            scores = result.get("scores", {})

            summary = (
                f"**Area Statistics for {postcode}**\n\n"
                f"• Population: {demographics.get('population', 'N/A'):,}\n"
                f"• Avg Age: {demographics.get('averageAge', 'N/A')}\n"
                f"• Deprivation Index: {demographics.get('deprivationIndex', 'N/A')}/10\n"
                f"• Employment Rate: {demographics.get('employmentRate', 'N/A')}%\n\n"
                f"**Area Scores (out of 10):**\n"
                f"• Safety: {scores.get('safety', '-')}\n"
                f"• Schools: {scores.get('schools', '-')}\n"
                f"• Transport: {scores.get('transport', '-')}\n"
                f"• Amenities: {scores.get('amenities', '-')}\n"
                f"• Green Space: {scores.get('greenSpace', '-')}\n"
                f"• Nightlife: {scores.get('nightlife', '-')}\n"
            )

            return {
                "status": "ok",
                "summary": summary,
                "visual_payload": visual_payload,
                "raw_data": result,
            }

    except httpx.HTTPError as e:
        logger.error("area_stats_http_error", error=str(e))
        return {"status": "error", "message": f"Failed to fetch area data: {e}"}
    except Exception as e:
        logger.error("area_stats_error", error=str(e))
        return {"status": "error", "message": str(e)}


@tool
async def get_area_stats(
    lat: float,
    lng: float,
    postcode: str,
) -> str:
    """Get area demographics, deprivation index, and neighbourhood scores.

    Use this tool when the user asks about an area, neighbourhood quality,
    demographics, or liveability scores for a location.

    Args:
        lat: Latitude of the location.
        lng: Longitude of the location.
        postcode: UK postcode of the area.

    Returns:
        JSON string with area statistics and visual payload.
    """
    import json

    result = await get_area_stats_impl(lat, lng, postcode)
    return json.dumps(result, indent=2, default=str)
