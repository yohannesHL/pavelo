"""
Redis Cache — Short-term Session Memory

Provides session-scoped key-value storage with TTL.
Used for conversation context that doesn't need to persist
across sessions (current search params, recently shown properties).
"""

from __future__ import annotations

import json
from typing import Any

import structlog

from src.config import settings

logger = structlog.get_logger()

# Default session TTL: 2 hours
DEFAULT_TTL = 7200


class RedisSessionCache:
    """Redis-backed short-term session memory."""

    def __init__(self, redis_url: str | None = None):
        self._client = None
        self._url = redis_url or settings.redis_url

    async def _ensure_client(self):
        if self._client is not None:
            return True

        try:
            import redis.asyncio as aioredis

            self._client = aioredis.from_url(self._url)
            await self._client.ping()
            logger.info("redis_cache_connected")
            return True
        except Exception as e:
            logger.error("redis_cache_error", error=str(e))
            return False

    def _key(self, session_id: str, field: str) -> str:
        return f"session:{session_id}:{field}"

    async def get(self, session_id: str, field: str) -> Any | None:
        """Get a value from session cache."""
        if not await self._ensure_client():
            return None

        try:
            val = await self._client.get(self._key(session_id, field))  # type: ignore
            return json.loads(val) if val else None
        except Exception as e:
            logger.error("redis_get_error", error=str(e))
            return None

    async def set(
        self, session_id: str, field: str, value: Any, ttl: int = DEFAULT_TTL
    ) -> bool:
        """Set a value in session cache with TTL."""
        if not await self._ensure_client():
            return False

        try:
            await self._client.setex(  # type: ignore
                self._key(session_id, field),
                ttl,
                json.dumps(value),
            )
            return True
        except Exception as e:
            logger.error("redis_set_error", error=str(e))
            return False

    async def delete(self, session_id: str, field: str) -> bool:
        """Delete a value from session cache."""
        if not await self._ensure_client():
            return False

        try:
            await self._client.delete(self._key(session_id, field))  # type: ignore
            return True
        except Exception as e:
            logger.error("redis_delete_error", error=str(e))
            return False


session_cache = RedisSessionCache()
