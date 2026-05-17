"""
Response Generator Node

Generates the agent's response based on intent, memory context,
and tool results. Will use LLM streaming in Sprint 5.
"""

from __future__ import annotations

import structlog
from langchain_core.messages import AIMessage

from src.state import AgentState

logger = structlog.get_logger()


def response_generator_node(state: AgentState) -> dict:
    """Generate the agent's response.

    This node:
    1. Takes the classified intent, memory context, and tool results.
    2. Constructs a prompt with persona and context.
    3. Generates a response using the LLM.
    4. Returns the response as an AIMessage appended to messages.

    Args:
        state: Current agent state.

    Returns:
        Partial state update with new AIMessage in messages.
    """
    logger.info(
        "response_generator",
        intent=state.intent,
        tool_result_count=len(state.tool_results),
        user_id=state.user_id,
    )

    # TODO: LLM-based response generation (Sprint 5)
    # For now, generate stub responses based on intent

    intent_responses = {
        "greeting": "Hello! I'm Xara, your AI estate agent. How can I help you find your perfect property today?",
        "farewell": "Thank you for chatting! I'll remember your preferences for next time. Have a wonderful day!",
        "property_search": "I'd love to help you find properties. Let me search based on your criteria. (Search integration coming in Sprint 4)",
        "property_detail": "Let me get the full details on that property for you. (Detail retrieval coming in Sprint 4)",
        "area_inquiry": "Great question about the area! I can provide neighbourhood insights including schools, transport, and amenities. (Area intelligence coming in Sprint 7)",
        "valuation_request": "I can help with a property valuation based on comparable sales and market trends. (Valuation engine coming in Sprint 8)",
        "booking_request": "I'll help you schedule a viewing. (Booking system coming in Sprint 8)",
        "comparison": "Let me compare those properties side by side for you. (Comparison tool coming in Sprint 5)",
        "general_question": "That's a great question. Let me help you with that.",
    }

    response_text = intent_responses.get(
        state.intent,
        "I'm here to help with your property search. Could you tell me more about what you're looking for?",
    )

    new_message = AIMessage(content=response_text)

    return {"messages": state.messages + [new_message]}
