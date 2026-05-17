"""
Tool Executor Node (S5-05)

Executes additional tools based on intent:
- get_property_details
- compare_properties
- get_mortgage_estimate

Runs tools in parallel when possible, collects results
for the response generator.
"""

from __future__ import annotations

import asyncio
from typing import Any

import structlog

from src.state import AgentState
from src.tools.get_property_details import get_property_details_impl
from src.tools.compare_properties import compare_properties_impl
from src.tools.get_mortgage_estimate import get_mortgage_estimate_impl

logger = structlog.get_logger()


async def tool_executor_node(state: AgentState) -> dict:
    """Execute tools based on intent and message content.

    This node examines the intent and conversation to determine
    which tools to execute, then collects results.

    Args:
        state: Current agent state.

    Returns:
        Partial state update with tool_results.
    """
    logger.info(
        "tool_executor",
        intent=state.intent,
        user_id=state.user_id,
    )

    tool_results = list(state.tool_results)  # Copy existing results

    # Extract relevant info from the latest message
    last_message = ""
    for msg in reversed(state.messages):
        if hasattr(msg, "type") and msg.type == "human":
            last_message = msg.content
            break

    params = state.active_search_params or {}

    # Route to appropriate tool based on intent
    if state.intent == "comparison":
        # Look for property IDs in params or recent context
        property_ids = params.get("property_ids", [])
        if property_ids and len(property_ids) >= 2:
            result = await compare_properties_impl(property_ids)
            tool_results.append({
                "tool": "compare_properties",
                **result,
            })

    elif state.intent == "property_detail":
        property_id = params.get("property_id")
        if property_id:
            result = await get_property_details_impl(property_id)
            tool_results.append({
                "tool": "get_property_details",
                **result,
            })

    elif state.intent == "valuation_request":
        # Check if there's a price mentioned for mortgage estimate
        price = params.get("price") or params.get("max_price")
        if price:
            result = await get_mortgage_estimate_impl(
                price=price,
                deposit=params.get("deposit"),
                deposit_percent=params.get("deposit_percent", 10),
            )
            tool_results.append({
                "tool": "get_mortgage_estimate",
                **result,
            })

    return {"tool_results": tool_results}
