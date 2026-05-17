"""
Mem0 Client — Episodic Memory for Xara

Provides cross-session memory recall using Mem0.
Xara remembers user preferences, past searches, liked properties,
and conversation context across sessions.

Memory namespaces:
- user:{user_id} — per-user episodic memories
- session:{session_id} — session-scoped context
"""

from __future__ import annotations

from typing import Any

import structlog

logger = structlog.get_logger()


class Mem0Client:
    """Wrapper around the Mem0 memory client.

    Handles initialization, search, add, and delete operations
    with proper namespace scoping per user.
    """

    def __init__(self, api_key: str | None = None, org_id: str | None = None):
        """Initialize the Mem0 client.

        Args:
            api_key: Mem0 API key. If None, uses env MEM0_API_KEY.
            org_id: Mem0 organization ID. If None, uses env MEM0_ORG_ID.
        """
        self._client = None
        self._api_key = api_key
        self._org_id = org_id

        # Lazy initialization — don't fail if Mem0 isn't configured yet
        logger.info("mem0_client_init", configured=api_key is not None)

    def _ensure_client(self) -> bool:
        """Lazily initialize the Mem0 client.

        Returns:
            True if client is ready, False if not configured.
        """
        if self._client is not None:
            return True

        try:
            from mem0 import MemoryClient

            self._client = MemoryClient(
                api_key=self._api_key,
                org_id=self._org_id,
            )
            logger.info("mem0_client_connected")
            return True
        except ImportError:
            logger.warning("mem0_not_installed", hint="pip install mem0ai")
            return False
        except Exception as e:
            logger.error("mem0_init_error", error=str(e))
            return False

    def search(
        self,
        query: str,
        user_id: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Search episodic memories for a user.

        Args:
            query: Natural language search query.
            user_id: User ID to scope the search.
            limit: Maximum number of memories to return.

        Returns:
            List of memory objects with content and metadata.
        """
        if not self._ensure_client():
            logger.debug("mem0_search_skipped", reason="client_not_ready")
            return []

        try:
            results = self._client.search(  # type: ignore
                query=query,
                user_id=user_id,
                limit=limit,
            )
            logger.info(
                "mem0_search_complete",
                user_id=user_id,
                result_count=len(results),
            )
            return results
        except Exception as e:
            logger.error("mem0_search_error", error=str(e), user_id=user_id)
            return []

    def add(
        self,
        messages: list[str],
        user_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Add new memories from conversation messages.

        Args:
            messages: List of message strings to extract memories from.
            user_id: User ID to scope the memories.
            metadata: Optional metadata (session_id, intent, etc).

        Returns:
            Response from Mem0 with created memory IDs.
        """
        if not self._ensure_client():
            logger.debug("mem0_add_skipped", reason="client_not_ready")
            return {"status": "skipped"}

        try:
            result = self._client.add(  # type: ignore
                messages=messages,
                user_id=user_id,
                metadata=metadata or {},
            )
            logger.info(
                "mem0_add_complete",
                user_id=user_id,
                message_count=len(messages),
            )
            return result
        except Exception as e:
            logger.error("mem0_add_error", error=str(e), user_id=user_id)
            return {"status": "error", "error": str(e)}

    def get_all(self, user_id: str) -> list[dict[str, Any]]:
        """Retrieve all memories for a user.

        Args:
            user_id: User ID to fetch memories for.

        Returns:
            List of all stored memories.
        """
        if not self._ensure_client():
            return []

        try:
            return self._client.get_all(user_id=user_id)  # type: ignore
        except Exception as e:
            logger.error("mem0_get_all_error", error=str(e), user_id=user_id)
            return []

    def delete(self, memory_id: str) -> bool:
        """Delete a specific memory.

        Args:
            memory_id: ID of the memory to delete.

        Returns:
            True if deleted, False otherwise.
        """
        if not self._ensure_client():
            return False

        try:
            self._client.delete(memory_id=memory_id)  # type: ignore
            return True
        except Exception as e:
            logger.error("mem0_delete_error", error=str(e), memory_id=memory_id)
            return False


# Module-level singleton — initialized lazily
mem0_client = Mem0Client()
