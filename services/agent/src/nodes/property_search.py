"""
Property Search Node

Executes property search based on active search parameters.
Will integrate with Qdrant hybrid search in Sprint 4.
"""

from __future__ import annotations

import structlog

from src.state import AgentState

logger = structlog.get_logger()


def property_search_node(state: AgentState) -> dict:
    """Execute property search based on extracted parameters.

    This node:
    1. Extracts search parameters from the conversation context.
    2. Queries the property database (Qdrant hybrid search in Sprint 4).
    3. Filters out already-shown properties.
    4. Returns results for the response generator.

    Args:
        state: Current agent state with active_search_params.

    Returns:
        Partial state update with tool_results and properties_shown.
    """
    logger.info(
        "property_search",
        params=state.active_search_params,
        already_shown=len(state.properties_shown),
        user_id=state.user_id,
    )

    # TODO: Integrate with Qdrant hybrid search (Sprint 4)
    # results = search_properties(
    #     params=state.active_search_params,
    #     exclude_ids=state.properties_shown,
    # )

    # Stub results
    tool_results = [
        {
            "tool": "property_search",
            "status": "stub",
            "results": [],
            "message": "Property search will be connected in Sprint 4 (Qdrant hybrid search).",
        }
    ]

    return {
        "tool_results": tool_results,
    }
