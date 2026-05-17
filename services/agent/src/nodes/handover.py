"""
Handover Escalation Node (S9-03)

Triggers human agent handover when:
1. User explicitly asks for a human
2. Agent confidence is low
3. Booking confirmations need human verification

Generates a context packet with conversation summary,
user preferences, and properties discussed.
"""

from __future__ import annotations

import os
import httpx
import logging
from typing import Any

from src.state import AgentState

logger = logging.getLogger(__name__)

API_URL = os.getenv("API_URL", "http://localhost:4000")

# Keywords that trigger handover
HANDOVER_KEYWORDS = [
    "speak to a human",
    "talk to someone",
    "real person",
    "human agent",
    "speak to an agent",
    "transfer me",
    "real agent",
    "speak to a real",
    "talk to a real",
    "can I speak to",
    "let me speak",
    "I want to talk to",
]

# Intents that may need human confirmation
CONFIRMATION_INTENTS = {"booking_request", "valuation_request"}

# Confidence threshold for escalation
LOW_CONFIDENCE_THRESHOLD = 0.3


def should_escalate(state: AgentState) -> tuple[bool, str]:
    """Determine if the conversation should be escalated to a human.

    Returns:
        Tuple of (should_escalate: bool, reason: str)
    """
    # Check for explicit human request in latest message
    if state.messages:
        last_msg = str(state.messages[-1].content).lower()
        for keyword in HANDOVER_KEYWORDS:
            if keyword in last_msg:
                return True, "user_requested"

    # Check for low confidence (if available in tool_results)
    for result in state.tool_results:
        confidence = result.get("confidence", 1.0)
        if isinstance(confidence, (int, float)) and confidence < LOW_CONFIDENCE_THRESHOLD:
            return True, "low_confidence"

    # Check for booking/valuation confirmation
    if state.intent in CONFIRMATION_INTENTS:
        # Only escalate if there are concrete details to confirm
        if state.tool_results and any(r.get("needs_confirmation") for r in state.tool_results):
            return True, "booking_confirmation"

    return False, ""


def generate_context_packet(state: AgentState) -> dict[str, Any]:
    """Generate a context summary packet for the human agent.

    Includes conversation summary, user preferences, and properties discussed.
    """
    # Extract properties discussed from tool results and search params
    properties_discussed = list(set(state.properties_shown))

    # Build conversation summary from recent messages
    recent_messages = state.messages[-10:] if len(state.messages) > 10 else state.messages
    summary_parts = []
    for msg in recent_messages:
        role = getattr(msg, "type", "unknown")
        content = str(msg.content)[:200]  # Truncate long messages
        summary_parts.append(f"{role}: {content}")

    context_summary = "\n".join(summary_parts)

    return {
        "contextSummary": context_summary,
        "userPreferences": state.user_preferences,
        "propertiesDiscussed": properties_discussed,
        "intent": state.intent,
        "searchParams": state.active_search_params,
        "memoryContext": {k: str(v)[:100] for k, v in state.memory_context.items()},
    }


async def handover_escalation_node(state: AgentState) -> AgentState:
    """Check if handover is needed and initiate it.

    If escalation is triggered:
    1. Generate context packet
    2. Call the API to create a handover request
    3. Set a response message informing the user
    """
    should, reason = should_escalate(state)

    if not should:
        return state

    logger.info(f"Handover escalation triggered: {reason} for user {state.user_id}")

    # Generate context packet
    context = generate_context_packet(state)

    # Call the API to create a handover request
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{API_URL}/trpc/agency.requestHandover",
                json={
                    "json": {
                        "agencyId": state.memory_context.get("agency_id", ""),
                        "conversationId": state.session_id,
                        "reason": reason,
                        "contextSummary": context["contextSummary"],
                        "userPreferences": context["userPreferences"],
                        "propertiesDiscussed": context["propertiesDiscussed"],
                    }
                },
            )

            if response.status_code == 200:
                logger.info(f"Handover request created for session {state.session_id}")
            else:
                logger.warning(f"Handover API returned {response.status_code}")

    except Exception as e:
        logger.error(f"Failed to create handover request: {e}")

    # Update state with handover visual payload
    state.visual_payloads.append({
        "type": "handover_notification",
        "data": {
            "reason": reason,
            "message": _get_handover_message(reason, state.agent_persona),
        },
    })

    return state


def _get_handover_message(reason: str, persona_name: str) -> str:
    """Get a user-friendly handover message."""
    name = persona_name.capitalize()
    messages = {
        "user_requested": (
            f"I understand you'd like to speak with one of our agents. "
            f"I'm connecting you now — they'll have full context of our conversation. "
            f"One moment please!"
        ),
        "low_confidence": (
            f"I want to make sure you get the best possible help here. "
            f"Let me connect you with one of our specialist agents who can assist further."
        ),
        "booking_confirmation": (
            f"For viewing confirmations, I'll connect you with an agent "
            f"who can verify availability and finalise the details for you."
        ),
    }
    return messages.get(reason, f"Let me connect you with a human agent for further assistance.")
