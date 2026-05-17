"""
Intent Classifier Node

Classifies the user's intent from the latest message to route
the conversation through the appropriate processing pipeline.
"""

from __future__ import annotations

import structlog

from src.state import AgentState, IntentType

logger = structlog.get_logger()

# Keywords for basic intent classification (stub — LLM-based in production)
INTENT_KEYWORDS: dict[str, list[str]] = {
    "property_search": [
        "find", "search", "looking for", "show me", "properties",
        "houses", "flats", "bedroom", "bed", "budget", "area",
    ],
    "property_detail": [
        "tell me more", "details", "about this", "this property",
        "more info", "what about",
    ],
    "area_inquiry": [
        "area", "neighbourhood", "schools", "crime", "transport",
        "amenities", "nearby",
    ],
    "valuation_request": [
        "value", "worth", "valuation", "estimate", "how much",
    ],
    "booking_request": [
        "book", "viewing", "visit", "appointment", "schedule",
    ],
    "comparison": [
        "compare", "versus", "vs", "difference", "better",
    ],
    "greeting": [
        "hello", "hi", "hey", "good morning", "good afternoon",
    ],
    "farewell": [
        "bye", "goodbye", "thanks", "thank you", "see you",
    ],
}


def intent_classifier_node(state: AgentState) -> dict:
    """Classify user intent from the latest message.

    Stub implementation using keyword matching.
    Will be replaced with LLM-based classification in Sprint 5.

    Args:
        state: Current agent state.

    Returns:
        Partial state update with intent field set.
    """
    if not state.messages:
        return {"intent": "greeting"}

    last_message = state.messages[-1].content.lower()

    # Simple keyword matching (placeholder for LLM classifier)
    best_intent: IntentType = "general_question"
    best_score = 0

    for intent, keywords in INTENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in last_message)
        if score > best_score:
            best_score = score
            best_intent = intent  # type: ignore

    logger.info(
        "intent_classified",
        intent=best_intent,
        score=best_score,
        user_id=state.user_id,
    )

    return {"intent": best_intent}
