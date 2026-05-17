"""
User Profile Store — Long-term Preferences (PostgreSQL)

Manages user preferences and profile data stored in the
PostgreSQL database via the API gateway.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from src.config import settings

logger = structlog.get_logger()


class ProfileStore:
    """Manages user profile and preference data via the API."""

    def __init__(self, api_base_url: str | None = None):
        self._base_url = api_base_url or f"http://localhost:{settings.port}"

    async def get_preferences(self, user_id: str) -> dict[str, Any]:
        """Fetch user preferences from the API.

        Args:
            user_id: User ID to fetch preferences for.

        Returns:
            User preferences dictionary.
        """
        # TODO: Call the API to get user preferences
        # For now, return empty preferences
        logger.info("profile_get_preferences", user_id=user_id)
        return {}

    async def update_preferences(
        self, user_id: str, preferences: dict[str, Any]
    ) -> bool:
        """Update user preferences via the API.

        Args:
            user_id: User ID to update.
            preferences: New preference values to merge.

        Returns:
            True if updated successfully.
        """
        logger.info(
            "profile_update_preferences",
            user_id=user_id,
            fields=list(preferences.keys()),
        )
        # TODO: Call the API to update preferences
        return True


profile_store = ProfileStore()
