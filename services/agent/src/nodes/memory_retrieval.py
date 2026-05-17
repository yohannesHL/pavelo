"""
Memory Retrieval Node (S5-04)

Retrieves relevant episodic memories from Mem0 and user preferences
from the database to provide context for the current conversation turn.
"""

from __future__ import annotations

import structlog

from src.state import AgentState
from src.memory.mem0_client import mem0_client

logger = structlog.get_logger()


async def memory_retrieval_node(state: AgentState) -> dict:
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

    episodic_memories = []
    query = ""

    # Get the latest user message for memory search
    if state.messages:
        query = state.messages[-1].content

    # Search Mem0 for relevant memories
    if query and state.user_id:
        try:
            memories = mem0_client.search(
                query=query,
                user_id=state.user_id,
                limit=5,
            )
            episodic_memories = [
                {
                    "content": m.get("memory", m.get("content", "")),
                    "metadata": m.get("metadata", {}),
                }
                for m in memories
                if m
            ]
            logger.info(
                "mem0_search_results",
                count=len(episodic_memories),
                user_id=state.user_id,
            )
        except Exception as e:
            logger.warning("mem0_search_failed", error=str(e))

    memory_context = {
        "episodic_memories": episodic_memories,
        "user_preferences": state.user_preferences,
        "properties_shown": state.properties_shown,
    }

    return {"memory_context": memory_context}
