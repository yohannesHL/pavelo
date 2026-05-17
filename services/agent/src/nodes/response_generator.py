"""
Response Generator Node (S5-04)

Generates the agent's response using OpenAI with full context:
persona, memory, tool results, and conversation history.
Supports streaming response generation.
"""

from __future__ import annotations

import json
from typing import AsyncIterator

import structlog
from langchain_core.messages import AIMessage

from src.config import settings
from src.state import AgentState
from src.nodes.persona import build_system_prompt

logger = structlog.get_logger()


def _format_tool_results(tool_results: list[dict]) -> str:
    """Format tool results into a readable context block."""
    if not tool_results:
        return ""

    parts = []
    for result in tool_results:
        tool_name = result.get("tool", "unknown")
        status = result.get("status", "unknown")

        if tool_name == "property_search" and status == "success":
            count = result.get("results_count", 0)
            results = result.get("results", [])
            parts.append(f"**Property Search Results** ({count} found):")
            for r in results[:5]:
                parts.append(
                    f"  - {r.get('title', 'Unknown')} — £{r.get('price', 0):,} — "
                    f"{r.get('bedrooms', 0)} bed, {r.get('bathrooms', 0)} bath — "
                    f"{r.get('city', '')}, {r.get('postcode', '')}"
                )
        elif tool_name == "get_property_details" and status == "success":
            prop = result.get("property", {})
            parts.append(f"**Property Details for {prop.get('title', 'Unknown')}:**")
            parts.append(json.dumps(prop, indent=2, default=str))
        elif tool_name == "compare_properties" and status == "success":
            parts.append("**Property Comparison:**")
            parts.append(json.dumps(result.get("comparison", {}), indent=2, default=str))
        elif tool_name == "get_mortgage_estimate" and status == "success":
            parts.append("**Mortgage Estimate:**")
            parts.append(json.dumps(result.get("estimate", {}), indent=2, default=str))
        elif status == "error":
            parts.append(f"Tool '{tool_name}' error: {result.get('message', 'Unknown error')}")
        else:
            parts.append(f"Tool '{tool_name}' result: {json.dumps(result, indent=2, default=str)}")

    return "\n".join(parts)


def _format_memories(memory_context: dict) -> str:
    """Format memory context into readable text."""
    memories = memory_context.get("episodic_memories", [])
    if not memories:
        return ""

    parts = ["**What I remember about you:**"]
    for mem in memories:
        content = mem.get("content", "")
        if content:
            parts.append(f"  - {content}")

    preferences = memory_context.get("user_preferences", {})
    if preferences:
        parts.append("**Your preferences:**")
        for k, v in preferences.items():
            parts.append(f"  - {k}: {v}")

    return "\n".join(parts)


def _build_visual_payloads(tool_results: list[dict]) -> list[dict]:
    """Extract visual payloads from tool results for inline rendering."""
    payloads = []

    for result in tool_results:
        tool_name = result.get("tool", "")
        status = result.get("status", "")

        if tool_name == "property_search" and status == "success":
            results = result.get("results", [])
            if len(results) == 1:
                payloads.append({
                    "type": "property_card",
                    "data": results[0],
                    "title": "Property Found",
                })
            elif len(results) > 1:
                payloads.append({
                    "type": "property_carousel",
                    "data": {"properties": results[:6]},
                    "title": f"{len(results)} Properties Found",
                })

        elif tool_name == "compare_properties" and status == "success":
            payloads.append({
                "type": "comparison_table",
                "data": {"properties": result.get("comparison", {}).get("properties", [])},
                "title": "Property Comparison",
            })

        elif tool_name == "get_mortgage_estimate" and status == "success":
            payloads.append({
                "type": "mortgage_estimate",
                "data": result.get("estimate", {}),
                "title": "Mortgage Estimate",
            })

    return payloads


async def response_generator_node(state: AgentState) -> dict:
    """Generate the agent's response using OpenAI.

    This node:
    1. Builds a system prompt with persona and context.
    2. Includes memory context and tool results.
    3. Generates a response via OpenAI.
    4. Extracts visual payloads for inline rendering.

    Args:
        state: Current agent state.

    Returns:
        Partial state update with new AIMessage and visual payloads.
    """
    logger.info(
        "response_generator",
        intent=state.intent,
        tool_result_count=len(state.tool_results),
        user_id=state.user_id,
    )

    # Build context sections
    tool_context = _format_tool_results(state.tool_results)
    memory_context = _format_memories(state.memory_context)

    # Build system prompt with persona
    system_prompt = build_system_prompt(
        persona_name=settings.persona_name,
        persona_tone=settings.persona_tone,
        persona_formality=settings.persona_formality,
    )

    # Add context to system prompt
    context_parts = []
    if memory_context:
        context_parts.append(memory_context)
    if tool_context:
        context_parts.append(f"\n**Tool Results Available:**\n{tool_context}")
    if state.intent:
        context_parts.append(f"\n**Classified Intent:** {state.intent}")

    if context_parts:
        system_prompt += "\n\n---\n**CONTEXT FOR THIS RESPONSE:**\n" + "\n".join(context_parts)

    # Build message history for OpenAI
    openai_messages = [{"role": "system", "content": system_prompt}]

    for msg in state.messages[-10:]:  # Last 10 messages for context window
        role = "user" if hasattr(msg, "type") and msg.type == "human" else "assistant"
        openai_messages.append({"role": role, "content": msg.content})

    # Generate response
    try:
        if settings.openai_api_key:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)

            response = await client.chat.completions.create(
                model=settings.openai_model,
                messages=openai_messages,
                temperature=0.7,
                max_tokens=1000,
            )

            response_text = response.choices[0].message.content or ""
        else:
            # No API key — generate stub response
            response_text = _stub_response(state.intent, state.tool_results)

    except Exception as e:
        logger.error("response_generator_error", error=str(e))
        response_text = _stub_response(state.intent, state.tool_results)

    # Build visual payloads from tool results
    visual_payloads = _build_visual_payloads(state.tool_results)

    new_message = AIMessage(content=response_text)

    result = {"messages": state.messages + [new_message]}

    # Attach visual payloads to state for the streaming relay
    if visual_payloads:
        result["visual_payloads"] = visual_payloads

    return result


async def response_generator_stream(state: AgentState) -> AsyncIterator[str]:
    """Stream response tokens for real-time rendering.

    Yields individual tokens as they're generated.
    """
    system_prompt = build_system_prompt(
        persona_name=settings.persona_name,
        persona_tone=settings.persona_tone,
        persona_formality=settings.persona_formality,
    )

    tool_context = _format_tool_results(state.tool_results)
    memory_context = _format_memories(state.memory_context)

    if memory_context:
        system_prompt += f"\n\n{memory_context}"
    if tool_context:
        system_prompt += f"\n\n**Tool Results:**\n{tool_context}"

    openai_messages = [{"role": "system", "content": system_prompt}]
    for msg in state.messages[-10:]:
        role = "user" if hasattr(msg, "type") and msg.type == "human" else "assistant"
        openai_messages.append({"role": role, "content": msg.content})

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)

        stream = await client.chat.completions.create(
            model=settings.openai_model,
            messages=openai_messages,
            temperature=0.7,
            max_tokens=1000,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except Exception as e:
        logger.error("stream_error", error=str(e))
        yield _stub_response(state.intent, state.tool_results)


def _stub_response(intent: str, tool_results: list[dict]) -> str:
    """Generate stub response when OpenAI is unavailable."""
    # Check if we have search results
    for result in tool_results:
        if result.get("tool") == "property_search" and result.get("status") == "success":
            count = result.get("results_count", 0)
            if count > 0:
                return f"I found {count} properties matching your criteria! Take a look at the results below. Would you like me to tell you more about any of them?"
            return "I couldn't find any properties matching those exact criteria. Would you like me to adjust the search parameters?"

    responses = {
        "greeting": "Hello! I'm Xara, your AI estate agent. How can I help you find your perfect property today?",
        "farewell": "Thank you for chatting! I'll remember your preferences for next time. Have a wonderful day!",
        "property_search": "I'd love to help you find properties. Could you tell me what you're looking for — area, budget, number of bedrooms?",
        "property_detail": "Let me get the full details on that property for you.",
        "area_inquiry": "Great question about the area! I can provide neighbourhood insights including schools, transport, and amenities.",
        "valuation_request": "I can help with a property valuation based on comparable sales and market trends. Could you tell me the address?",
        "booking_request": "I'll help you schedule a viewing. Which property are you interested in?",
        "comparison": "Let me compare those properties side by side for you.",
        "general_question": "That's a great question. Let me help you with that.",
    }

    return responses.get(intent, "I'm here to help with your property search. Could you tell me more about what you're looking for?")
