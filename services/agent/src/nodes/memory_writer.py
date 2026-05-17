"""
Memory Writer Node (S5-04)

Writes relevant conversation data to Mem0 episodic memory
for cross-session recall. Extracts key facts, preferences,
and interaction patterns.
"""

from __future__ import annotations

import structlog

from src.state import AgentState
from src.memory.mem0_client import mem0_client

logger = structlog.get_logger()


async def memory_writer_node(state: AgentState) -> dict:
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

    # Only write memories for meaningful intents
    skip_intents = {"greeting", "farewell", "clarification"}
    if state.intent in skip_intents:
        return {}

    if not state.user_id or len(state.messages) < 2:
        return {}

    # Extract the last exchange (user message + agent response)
    recent_messages = []
    for msg in state.messages[-2:]:
        role = "user" if hasattr(msg, "type") and msg.type == "human" else "assistant"
        recent_messages.append(f"{role}: {msg.content}")

    if not recent_messages:
        return {}

    try:
        mem0_client.add(
            messages=recent_messages,
            user_id=state.user_id,
            metadata={
                "session_id": state.session_id,
                "intent": state.intent,
            },
        )
        logger.info(
            "memory_written",
            user_id=state.user_id,
            message_count=len(recent_messages),
        )
    except Exception as e:
        logger.warning("memory_write_failed", error=str(e))

    return {}
