"""
Memory Retrieval Node

Retrieves relevant episodic memories from Mem0 and user preferences
from the database to provide context for the current conversation turn.
"""

from __future__ import annotations

import structlog

from src.state import AgentState

logger = structlog.get_logger()


def memory_retrieval_node(state: AgentState) -> dict:
    """Retrieve memories and user context.

    This node:
    1. Queries Mem0 for relevant episodic memories based on the latest message.
    2. Loads user preferences from the profile store.
    3. Merges context into state for downstream nodes.

    Args:
        state: Current agent state.

    Returns:
        Partial state update with memory_context populated.
    """
    logger.info(
        "memory_retrieval",
        user_id=state.user_id,
        session_id=state.session_id,
        message_count=len(state.messages),
    )

    # TODO: Integrate Mem0 search here
    # memories = mem0_client.search(
    #     query=state.messages[-1].content if state.messages else "",
    #     user_id=state.user_id,
    #     limit=5,
    # )

    memory_context = {
        "episodic_memories": [],  # Will be populated by Mem0
        "user_preferences": state.user_preferences,
        "properties_shown": state.properties_shown,
    }

    return {"memory_context": memory_context}
