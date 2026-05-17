"""
get_school_ratings — Fetch school data via Ofsted API wrapper (S7-10)

Calls Ofsted wrapper on the Node API, returns school data,
emits school_map visual payload for the frontend.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from langchain_core.tools import tool

from src.config import settings

logger = structlog.get_logger()

API_URL = settings.api_gateway_url


async def get_school_ratings_impl(
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    school_type: str = "all",
) -> dict[str, Any]:
    """Fetch school data from the intelligence API.

    Returns schools with Ofsted ratings and map data.
    """
    try:
        import json

        params = json.dumps({
            "lat": lat,
            "lng": lng,
            "radiusKm": radius_km,
            "type": school_type,
            "rating": "all",
        })

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                f"{API_URL}/trpc/intelligence.schools",
                params={"input": params},
            )
            response.raise_for_status()
            data = response.json()
            result = data.get("result", {}).get("data", {})

            if not result:
                return {"status": "error", "message": "No school data available"}

            # Build visual payload
            visual_payload = {
                "type": "school_map",
                "data": {
                    "schools": result.get("schools", []),
                    "center": result.get("center", {"lat": lat, "lng": lng}),
                    "radius": result.get("radius", radius_km),
                },
                "title": "School Catchment Map",
            }

            # Format text response
            schools = result.get("schools", [])
            total = len(schools)

            # Count by rating
            rating_counts: dict[str, int] = {}
            for s in schools:
                rating = s.get("ofstedRating", "Unknown")
                rating_counts[rating] = rating_counts.get(rating, 0) + 1

            rating_lines = "\n".join(
                f"• {rating}: {count}"
                for rating, count in sorted(
                    rating_counts.items(),
                    key=lambda x: x[1],
                    reverse=True,
                )
            )

            # Top schools
            outstanding = [
                s for s in schools if s.get("ofstedRating") == "Outstanding"
            ]
            top_lines = ""
            if outstanding:
                top_lines = "\n\n**Outstanding schools:**\n" + "\n".join(
                    f"• {s.get('name', '')} ({s.get('type', '')}, {s.get('distance', 0)}km)"
                    for s in outstanding[:3]
                )

            summary = (
                f"**Schools within {radius_km}km**\n\n"
                f"Total: {total} schools\n\n"
                f"**By rating:**\n{rating_lines}"
                f"{top_lines}\n"
            )

            return {
                "status": "ok",
                "summary": summary,
                "visual_payload": visual_payload,
                "total": total,
            }

    except httpx.HTTPError as e:
        logger.error("school_ratings_http_error", error=str(e))
        return {"status": "error", "message": f"Failed to fetch school data: {e}"}
    except Exception as e:
        logger.error("school_ratings_error", error=str(e))
        return {"status": "error", "message": str(e)}


@tool
async def get_school_ratings(
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    school_type: str = "all",
) -> str:
    """Get school ratings and catchment data for a location.

    Use this tool when the user asks about schools, Ofsted ratings,
    school catchment areas, or education quality near a location.

    Args:
        lat: Latitude of the location.
        lng: Longitude of the location.
        radius_km: Search radius in kilometres (default 3).
        school_type: Filter by type — "primary", "secondary", or "all".

    Returns:
        JSON string with school data and visual payload.
    """
    import json

    result = await get_school_ratings_impl(lat, lng, radius_km, school_type)
    return json.dumps(result, indent=2, default=str)
