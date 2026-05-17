"""
get_transport_links — Fetch isochrone data via TravelTime API wrapper (S7-10)

Calls TravelTime wrapper on the Node API, returns isochrone data,
emits transport_isochrone visual payload for the frontend.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from langchain_core.tools import tool

from src.config import settings

logger = structlog.get_logger()

API_URL = settings.api_gateway_url


async def get_transport_links_impl(
    lat: float,
    lng: float,
    modes: list[str] | None = None,
    time_bands: list[int] | None = None,
) -> dict[str, Any]:
    """Fetch transport isochrone data from the intelligence API.

    Returns isochrone polygons and travel time zones.
    """
    if modes is None:
        modes = ["public_transport"]
    if time_bands is None:
        time_bands = [15, 30, 45]

    try:
        import json

        params = json.dumps({
            "lat": lat,
            "lng": lng,
            "modes": modes,
            "timeBands": time_bands,
        })

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{API_URL}/trpc/intelligence.isochrones",
                params={"input": params},
            )
            response.raise_for_status()
            data = response.json()
            result = data.get("result", {}).get("data", {})

            if not result:
                return {"status": "error", "message": "No transport data available"}

            # Build visual payload
            visual_payload = {
                "type": "transport_isochrone",
                "data": {
                    "isochrones": result.get("isochrones", []),
                    "origin": result.get("origin", {"lat": lat, "lng": lng}),
                    "destination": result.get("destination"),
                    "modes": result.get("modes", modes),
                },
                "title": "Transport Isochrones",
            }

            # Format text response
            isochrones = result.get("isochrones", [])
            mode_label = {
                "public_transport": "public transport",
                "driving": "car",
                "walking": "walking",
                "cycling": "cycling",
            }

            zone_lines = []
            for iso in isochrones:
                mode_name = mode_label.get(iso.get("mode", ""), iso.get("mode", ""))
                zone_lines.append(
                    f"• {iso.get('timeMinutes', 0)} min by {mode_name}: "
                    f"~{iso.get('area', 0)} km² coverage"
                )

            summary = (
                f"**Transport Isochrones**\n\n"
                f"From: ({lat:.4f}, {lng:.4f})\n\n"
                f"**Travel time zones:**\n"
                + "\n".join(zone_lines)
                + "\n"
            )

            return {
                "status": "ok",
                "summary": summary,
                "visual_payload": visual_payload,
            }

    except httpx.HTTPError as e:
        logger.error("transport_links_http_error", error=str(e))
        return {"status": "error", "message": f"Failed to fetch transport data: {e}"}
    except Exception as e:
        logger.error("transport_links_error", error=str(e))
        return {"status": "error", "message": str(e)}


@tool
async def get_transport_links(
    lat: float,
    lng: float,
    modes: list[str] | None = None,
    time_bands: list[int] | None = None,
) -> str:
    """Get transport connectivity and commute time isochrones for a location.

    Use this tool when the user asks about transport links, commute times,
    how long it takes to get somewhere, or accessibility of a location.

    Args:
        lat: Latitude of the location.
        lng: Longitude of the location.
        modes: Transport modes — "public_transport", "driving", "walking", "cycling".
               Defaults to ["public_transport"].
        time_bands: Time bands in minutes. Defaults to [15, 30, 45].

    Returns:
        JSON string with isochrone data and visual payload.
    """
    import json

    result = await get_transport_links_impl(lat, lng, modes, time_bands)
    return json.dumps(result, indent=2, default=str)
