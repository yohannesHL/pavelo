"""
Memory Search Tool — LangGraph tool for searching user memories.

Wraps the Mem0 client to be used as a LangGraph tool.
The agent can invoke this tool to recall past conversations,
user preferences, and interaction history.
"""

from __future__ import annotations

from typing import Any

import structlog

from src.memory.mem0_client import mem0_client

logger = structlog.get_logger()


def memory_search(user_id: str, query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Search user memories via Mem0.

    This tool is invoked by the LangGraph agent when it needs
    to recall information from past conversations.

    Args:
        user_id: User ID to search memories for.
        query: Natural language search query.
        limit: Maximum number of results.

    Returns:
        List of relevant memory objects.
    """
    logger.info("tool_memory_search", user_id=user_id, query=query[:50])

    results = mem0_client.search(
        query=query,
        user_id=user_id,
        limit=limit,
    )

    return results
