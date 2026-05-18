"""
Intent Classifier Node (S5-04)

Uses OpenAI to classify the user's intent from the latest message.
Routes conversation through the appropriate processing pipeline.

Intents:
  - property_search: User wants to find properties
  - property_detail: User wants details on a specific property
  - comparison: User wants to compare properties
  - valuation_request: User wants a property valuation
  - area_inquiry: User asks about neighbourhood/area
  - booking_request: User wants to book a viewing
  - greeting: Hello/welcome
  - farewell: Goodbye
  - general_question: General real estate question
"""

from __future__ import annotations

import json

import structlog

from src.config import settings
from src.state import AgentState, IntentType
from src.providers.factory import get_llm
from src.providers.base import LLMMessage

logger = structlog.get_logger()

# Fallback keyword matching for when OpenAI is unavailable
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
        "value", "worth", "valuation", "estimate", "how much is my",
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

CLASSIFY_FUNCTION = {
    "name": "classify_intent",
    "description": "Classify the user's intent from their message",
    "parameters": {
        "type": "object",
        "properties": {
            "intent": {
                "type": "string",
                "enum": [
                    "property_search", "property_detail", "area_inquiry",
                    "valuation_request", "booking_request", "comparison",
                    "general_question", "greeting", "farewell", "clarification",
                ],
                "description": "The classified intent",
            },
            "confidence": {
                "type": "number",
                "description": "Confidence score 0-1",
            },
            "extracted_params": {
                "type": "object",
                "description": "Any search parameters extracted from the message",
                "properties": {
                    "min_price": {"type": "integer"},
                    "max_price": {"type": "integer"},
                    "min_bedrooms": {"type": "integer"},
                    "max_bedrooms": {"type": "integer"},
                    "property_type": {"type": "string"},
                    "area": {"type": "string"},
                    "postcode": {"type": "string"},
                },
            },
        },
        "required": ["intent", "confidence"],
    },
}


async def _classify_with_llm(message: str, context: str = "") -> tuple[str, dict]:
    """Classify intent using LLM function calling.

    Returns:
        Tuple of (intent, extracted_params)
    """
    llm = get_llm()

    system_prompt = """You are an intent classifier for a UK real estate AI assistant called Xara.
Classify the user's message into one of these intents:

- property_search: User wants to find/search for properties
- property_detail: User asks about a specific property they've seen
- area_inquiry: User asks about a neighbourhood, schools, crime, transport
- valuation_request: User wants to know what their property is worth
- booking_request: User wants to book a viewing
- comparison: User wants to compare 2+ properties
- general_question: General real estate question or advice
- greeting: Hello, hi, starting conversation
- farewell: Goodbye, thanks, ending conversation
- clarification: User is clarifying a previous question

Also extract any search parameters if present (prices, bedrooms, area, etc).
"""

    messages = [LLMMessage(role="system", content=system_prompt)]
    if context:
        messages.append(LLMMessage(role="system", content=f"Recent conversation context:\n{context}"))
    messages.append(LLMMessage(role="user", content=message))

    result = await llm.complete_with_tools(
        messages,
        tools=[{"type": "function", "function": CLASSIFY_FUNCTION}],
        temperature=0,
        tool_choice={"type": "function", "function": {"name": "classify_intent"}},
    )

    tool_calls = result.get("tool_calls", [])
    if tool_calls:
        parsed = json.loads(tool_calls[0]["arguments"])
        return parsed.get("intent", "general_question"), parsed.get("extracted_params", {})

    return "general_question", {}


def _classify_with_keywords(message: str) -> str:
    """Fallback: keyword-based intent classification."""
    best_intent: IntentType = "general_question"
    best_score = 0

    for intent, keywords in INTENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in message)
        if score > best_score:
            best_score = score
            best_intent = intent  # type: ignore

    return best_intent


async def intent_classifier_node(state: AgentState) -> dict:
    """Classify user intent from the latest message.

    Uses OpenAI function calling for accurate classification,
    with keyword fallback if OpenAI is unavailable.

    Args:
        state: Current agent state.

    Returns:
        Partial state update with intent and possibly search params.
    """
    if not state.messages:
        return {"intent": "greeting"}

    last_message = state.messages[-1].content

    # Build context from recent messages
    context_messages = state.messages[-5:] if len(state.messages) > 1 else []
    context = "\n".join(
        f"{'User' if hasattr(m, 'type') and m.type == 'human' else 'Assistant'}: {m.content[:200]}"
        for m in context_messages[:-1]
    )

    try:
        intent, extracted_params = await _classify_with_llm(last_message, context)

        # Merge extracted params into active search params
        updated_params = {**state.active_search_params}
        if extracted_params:
            for k, v in extracted_params.items():
                if v is not None:
                    updated_params[k] = v

        logger.info(
            "intent_classified_llm",
            intent=intent,
            params=extracted_params,
            user_id=state.user_id,
        )

        return {
            "intent": intent,
            "active_search_params": updated_params if extracted_params else state.active_search_params,
        }
    except Exception as e:
        logger.warning("intent_classifier_llm_fallback", error=str(e))

    # Fallback to keywords
    intent = _classify_with_keywords(last_message.lower())

    logger.info(
        "intent_classified_keywords",
        intent=intent,
        user_id=state.user_id,
    )

    return {"intent": intent}
