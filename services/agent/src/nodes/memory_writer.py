"""
Memory Writer Node

Writes relevant conversation data to Mem0 episodic memory
for cross-session recall. Extracts key facts, preferences,
and interaction patterns.
"""

from __future__ import annotations

import structlog

from src.state import AgentState

logger = structlog.get_logger()


def memory_writer_node(state: AgentState) -> dict:
    """Write conversation memories to Mem0.

    This node:
    1. Extracts key facts from the conversation turn.
    2. Identifies preference changes or new information.
    3. Writes episodic memories to Mem0 for future recall.

    Args:
        state: Current agent state after response generation.

    Returns:
        Partial state update (typically empty — side-effect node).
    """
    logger.info(
        "memory_writer",
        intent=state.intent,
        message_count=len(state.messages),
        user_id=state.user_id,
    )

    # TODO: Integrate Mem0 write here
    # Facts to extract:
    # - User preferences mentioned (budget, location, features)
    # - Properties the user liked or disliked
    # - Questions asked (indicates areas of interest)
    # - Decisions made (booking, shortlisting)

    # mem0_client.add(
    #     messages=[msg.content for msg in state.messages[-2:]],
    #     user_id=state.user_id,
    #     metadata={
    #         "session_id": state.session_id,
    #         "intent": state.intent,
    #     },
    # )

    return {}
