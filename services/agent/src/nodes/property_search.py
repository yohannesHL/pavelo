"""
Property Search Node (S4-03, S5-04)

Executes property search via the search_properties tool.
Integrates with Qdrant hybrid search through the ML service.
"""

from __future__ import annotations

import structlog

from src.state import AgentState
from src.tools.search_properties import SearchPropertiesInput, search_properties_impl

logger = structlog.get_logger()


async def property_search_node(state: AgentState) -> dict:
    """Execute property search based on extracted parameters.

    This node:
    1. Extracts the latest user message as the search query.
    2. Merges with any active_search_params from prior turns.
    3. Calls the search_properties tool (hybrid search via ML service).
    4. Filters out already-shown properties.
    5. Returns results for the response generator.

    Args:
        state: Current agent state with active_search_params.

    Returns:
        Partial state update with tool_results and properties_shown.
    """
    logger.info(
        "property_search_node",
        params=state.active_search_params,
        already_shown=len(state.properties_shown),
        user_id=state.user_id,
    )

    # Extract query from latest user message
    query = ""
    for msg in reversed(state.messages):
        if hasattr(msg, "type") and msg.type == "human":
            query = msg.content
            break

    if not query:
        return {
            "tool_results": [
                {
                    "tool": "property_search",
                    "status": "error",
                    "message": "No search query found in conversation.",
                }
            ],
        }

    # Build search input from state params + query
    params = state.active_search_params or {}
    input_data = SearchPropertiesInput(
        query=query,
        min_price=params.get("min_price"),
        max_price=params.get("max_price"),
        min_bedrooms=params.get("min_bedrooms"),
        max_bedrooms=params.get("max_bedrooms"),
        property_type=params.get("property_type"),
        area=params.get("area"),
        postcode=params.get("postcode"),
        top_k=params.get("top_k", 10),
        exclude_ids=state.properties_shown,
    )

    try:
        output = await search_properties_impl(input_data)
    except Exception as e:
        logger.error("property_search_error", error=str(e))
        return {
            "tool_results": [
                {
                    "tool": "property_search",
                    "status": "error",
                    "message": f"Search failed: {str(e)}",
                }
            ],
        }

    # Track shown property IDs
    new_shown = [r.id for r in output.results]

    tool_results = [
        {
            "tool": "property_search",
            "status": "success",
            "results_count": output.total_found,
            "query_used": output.query_used,
            "decomposed": output.decomposed,
            "results": [r.model_dump() for r in output.results],
        }
    ]

    return {
        "tool_results": tool_results,
        "properties_shown": state.properties_shown + new_shown,
        "active_search_params": {
            **params,
            **{k: v for k, v in output.decomposed.items()
               if v is not None and v != []},
        },
    }
