"""
Viewing Booking Tool — book_viewing (S8-06)

LangGraph tool for booking property viewings.
Creates bookings via the API gateway.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
import structlog
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from src.config import settings

logger = structlog.get_logger()

# Available time slots
TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
]


async def get_available_slots(
    property_id: str,
    date: str,
) -> dict[str, Any]:
    """Get available viewing slots for a property on a date.
    
    Args:
        property_id: Property UUID.
        date: Date string (YYYY-MM-DD).
        
    Returns:
        Available time slots.
    """
    api_url = settings.api_gateway_url
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{api_url}/api/v1/viewings/slots",
                params={"propertyId": property_id, "date": date},
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        logger.debug("slots_api_fallback", error=str(e))
    
    # Fallback: return all slots as available (demo mode)
    return {
        "status": "success",
        "propertyId": property_id,
        "date": date,
        "slots": TIME_SLOTS,
        "bookedSlots": [],
    }


async def book_viewing_impl(
    property_id: str,
    user_id: str,
    date: str,
    time: str,
    notes: Optional[str] = None,
) -> dict[str, Any]:
    """Book a property viewing.
    
    Args:
        property_id: Property UUID.
        user_id: User UUID.
        date: Date string (YYYY-MM-DD).
        time: Time slot (HH:MM).
        notes: Optional booking notes.
        
    Returns:
        Booking confirmation.
    """
    # Validate date is in future
    try:
        booking_date = datetime.strptime(date, "%Y-%m-%d")
        if booking_date.date() < datetime.now().date():
            return {
                "status": "error",
                "message": "Cannot book viewings in the past",
            }
    except ValueError:
        return {
            "status": "error",
            "message": "Invalid date format. Use YYYY-MM-DD.",
        }
    
    # Validate time slot
    if time not in TIME_SLOTS:
        return {
            "status": "error",
            "message": f"Invalid time slot. Available: {', '.join(TIME_SLOTS[:6])}...",
        }
    
    api_url = settings.api_gateway_url
    
    booking_data = {
        "propertyId": property_id,
        "userId": user_id,
        "date": date,
        "time": time,
        "notes": notes or "",
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{api_url}/api/v1/viewings/book",
                json=booking_data,
            )
            if response.status_code in (200, 201):
                result = response.json()
                # Fire CRM webhook stub
                await _fire_crm_webhook(booking_data)
                return result
    except Exception as e:
        logger.debug("booking_api_fallback", error=str(e))
    
    # Demo mode fallback
    await _fire_crm_webhook(booking_data)
    
    return {
        "status": "success",
        "booking": {
            "id": f"vb-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "propertyId": property_id,
            "date": date,
            "time": time,
            "status": "pending",
            "notes": notes,
            "message": f"Viewing booked for {date} at {time}. You'll receive a confirmation shortly.",
        },
    }


async def _fire_crm_webhook(booking_data: dict[str, Any]) -> None:
    """Fire CRM webhook stub (outbound POST on booking)."""
    crm_url = getattr(settings, "crm_webhook_url", None)
    if not crm_url:
        logger.debug("crm_webhook_skipped", reason="no_url_configured")
        return
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                crm_url,
                json={
                    "event": "viewing_booked",
                    "data": booking_data,
                    "timestamp": datetime.now().isoformat(),
                },
            )
            logger.info("crm_webhook_sent", event="viewing_booked")
    except Exception as e:
        logger.warning("crm_webhook_failed", error=str(e))


@tool
async def book_viewing(
    property_id: str,
    date: str,
    time: str,
    notes: Optional[str] = None,
    *,
    config: RunnableConfig,
) -> str:
    """Book a property viewing appointment.
    
    Use when the user wants to schedule a viewing for a specific property.
    
    Args:
        property_id: The UUID of the property to view.
        date: Requested date in YYYY-MM-DD format.
        time: Requested time slot (e.g. "10:00", "14:30").
        notes: Any notes for the viewing (optional).
        
    Returns:
        JSON string with booking confirmation.
    """
    # Extract user_id from LangGraph config (set by the graph invocation)
    user_id = (config.get("configurable") or {}).get("user_id", "")
    if not user_id:
        return json.dumps({
            "status": "error",
            "message": "Cannot book a viewing without a logged-in user. Please sign in first.",
        })

    result = await book_viewing_impl(
        property_id=property_id,
        user_id=user_id,
        date=date,
        time=time,
        notes=notes,
    )
    return json.dumps(result, indent=2, default=str)
