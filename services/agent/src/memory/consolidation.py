"""
Cross-session Memory Consolidation (S8-01)

Batch job that:
1. Extracts facts from all conversations for a user via Mem0
2. Deduplicates and merges conflicting memories (latest wins)
3. Updates consolidated user profile in PostgreSQL
4. Stores accumulated preferences, intent patterns, sentiment
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog

from src.config import settings
from src.memory.mem0_client import mem0_client

logger = structlog.get_logger()

# Preference categories for extraction
PREFERENCE_CATEGORIES = {
    "budget": ["budget", "price", "afford", "spend", "cost", "£", "max", "min"],
    "area": ["area", "location", "neighbourhood", "zone", "near", "close to", "postcode"],
    "property_type": ["detached", "semi", "terraced", "flat", "bungalow", "cottage", "house"],
    "style": ["victorian", "modern", "contemporary", "period", "new build", "art deco", "georgian", "edwardian"],
    "deal_breaker": ["must have", "need", "essential", "can't", "won't", "refuse", "deal breaker", "minimum"],
    "amenity": ["garden", "parking", "garage", "balcony", "ensuite", "conservatory", "loft"],
}


async def consolidate_user_memory(user_id: str) -> dict[str, Any]:
    """Consolidate all memories for a user into a structured profile.
    
    Steps:
    1. Fetch all episodic memories from Mem0
    2. Categorize and deduplicate facts
    3. Extract budget range, preferred areas, styles, etc.
    4. Update the user profile in PostgreSQL via API
    
    Args:
        user_id: The user ID to consolidate memories for.
        
    Returns:
        Consolidated profile data.
    """
    logger.info("memory_consolidation_start", user_id=user_id)
    
    # Step 1: Fetch all memories from Mem0
    all_memories = mem0_client.get_all(user_id=user_id)
    
    if not all_memories:
        logger.info("memory_consolidation_no_memories", user_id=user_id)
        return {"status": "no_memories", "user_id": user_id}
    
    # Step 2: Categorize memories
    categorized = _categorize_memories(all_memories)
    
    # Step 3: Extract structured preferences
    profile = _extract_profile(categorized, all_memories)
    
    # Step 4: Build memory timeline
    memory_timeline = _build_timeline(all_memories)
    
    # Step 5: Persist to PostgreSQL via API
    profile_data = {
        "userId": user_id,
        "preferences": profile.get("preferences", {}),
        "budgetMin": profile.get("budget_min"),
        "budgetMax": profile.get("budget_max"),
        "preferredAreas": profile.get("preferred_areas", []),
        "propertyStyles": profile.get("property_styles", []),
        "propertyTypes": profile.get("property_types", []),
        "dealBreakers": profile.get("deal_breakers", []),
        "intentPatterns": profile.get("intent_patterns", {}),
        "sentimentScore": profile.get("sentiment_score"),
        "memories": memory_timeline,
        "lastConsolidatedAt": datetime.now(timezone.utc).isoformat(),
    }
    
    saved = await _save_profile(user_id, profile_data)
    
    logger.info(
        "memory_consolidation_complete",
        user_id=user_id,
        memory_count=len(all_memories),
        categories=list(categorized.keys()),
    )
    
    return {
        "status": "success",
        "user_id": user_id,
        "memories_processed": len(all_memories),
        "profile": profile_data,
        "saved": saved,
    }


def _categorize_memories(
    memories: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Categorize memories by preference type.
    
    Each memory is assigned to one or more categories based on
    keyword matching against its content.
    """
    categorized: dict[str, list[dict[str, Any]]] = {k: [] for k in PREFERENCE_CATEGORIES}
    categorized["other"] = []
    
    for memory in memories:
        content = (memory.get("memory", "") or memory.get("content", "")).lower()
        matched = False
        
        for category, keywords in PREFERENCE_CATEGORIES.items():
            if any(kw in content for kw in keywords):
                categorized[category].append(memory)
                matched = True
        
        if not matched:
            categorized["other"].append(memory)
    
    return categorized


def _extract_profile(
    categorized: dict[str, list[dict[str, Any]]],
    all_memories: list[dict[str, Any]],
) -> dict[str, Any]:
    """Extract structured preferences from categorized memories.
    
    Uses latest-wins strategy for conflicting values.
    """
    profile: dict[str, Any] = {
        "preferences": {},
        "budget_min": None,
        "budget_max": None,
        "preferred_areas": [],
        "property_styles": [],
        "property_types": [],
        "deal_breakers": [],
        "intent_patterns": {},
        "sentiment_score": None,
    }
    
    # Extract budget from budget-related memories
    for mem in categorized.get("budget", []):
        content = mem.get("memory", "") or mem.get("content", "")
        numbers = _extract_numbers(content)
        if numbers:
            if len(numbers) >= 2:
                profile["budget_min"] = min(numbers)
                profile["budget_max"] = max(numbers)
            elif "max" in content.lower() or "under" in content.lower() or "up to" in content.lower():
                profile["budget_max"] = numbers[0]
            elif "min" in content.lower() or "at least" in content.lower() or "above" in content.lower():
                profile["budget_min"] = numbers[0]
            else:
                # Single number — treat as approximate target
                profile["budget_min"] = int(numbers[0] * 0.85)
                profile["budget_max"] = int(numbers[0] * 1.15)
    
    # Extract areas
    areas = set()
    for mem in categorized.get("area", []):
        content = mem.get("memory", "") or mem.get("content", "")
        # Extract area names (simple heuristic — words after location keywords)
        areas.add(content.strip())
    profile["preferred_areas"] = list(areas)[:10]  # limit
    
    # Extract property types
    types = set()
    type_keywords = ["detached", "semi-detached", "terraced", "flat", "bungalow", "cottage"]
    for mem in categorized.get("property_type", []):
        content = (mem.get("memory", "") or mem.get("content", "")).lower()
        for t in type_keywords:
            if t in content:
                types.add(t)
    profile["property_types"] = list(types)
    
    # Extract styles
    styles = set()
    style_keywords = ["victorian", "modern", "contemporary", "period", "new build", "art deco", "georgian", "edwardian"]
    for mem in categorized.get("style", []):
        content = (mem.get("memory", "") or mem.get("content", "")).lower()
        for s in style_keywords:
            if s in content:
                styles.add(s)
    profile["property_styles"] = list(styles)
    
    # Extract deal breakers
    breakers = set()
    for mem in categorized.get("deal_breaker", []):
        content = mem.get("memory", "") or mem.get("content", "")
        breakers.add(content.strip())
    profile["deal_breakers"] = list(breakers)[:10]
    
    # Aggregate all preferences
    profile["preferences"] = {
        "budget": {"min": profile["budget_min"], "max": profile["budget_max"]},
        "areas": profile["preferred_areas"],
        "types": profile["property_types"],
        "styles": profile["property_styles"],
        "dealBreakers": profile["deal_breakers"],
        "amenities": [
            (m.get("memory", "") or m.get("content", "")).strip()
            for m in categorized.get("amenity", [])
        ][:10],
    }
    
    return profile


def _extract_numbers(text: str) -> list[int]:
    """Extract monetary numbers from text (handles £, k, commas).
    
    Uses a single comprehensive regex to avoid duplicate matches
    from overlapping patterns (Fixes #39).
    """
    import re
    
    numbers = []
    seen_positions: set[int] = set()
    
    # Ordered patterns — most specific first to avoid duplicates
    patterns = [
        (r"£([\d,]+)\s*k\b", True),     # £500k → multiply by 1000
        (r"([\d,]+)\s*k\b", True),        # 500k → multiply by 1000
        (r"£([\d,]+)", False),             # £500,000
        (r"\b(\d{6,})\b", False),          # 500000+
    ]
    
    for pattern, is_k in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            # Skip if this position was already matched by a more specific pattern
            if match.start() in seen_positions:
                continue
            
            num_str = match.group(1).replace(",", "")
            try:
                num = int(num_str)
                if is_k:
                    num *= 1000
                if 10_000 <= num <= 100_000_000:  # reasonable property price range
                    numbers.append(num)
                    # Mark all character positions as used
                    for pos in range(match.start(), match.end()):
                        seen_positions.add(pos)
            except ValueError:
                pass
    
    return numbers


def _build_timeline(memories: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build a memory timeline with metadata for UI display."""
    timeline = []
    
    for mem in memories:
        content = mem.get("memory", "") or mem.get("content", "")
        created = mem.get("created_at", mem.get("createdAt", ""))
        memory_id = mem.get("id", "")
        
        # Determine category
        category = "general"
        content_lower = content.lower()
        for cat, keywords in PREFERENCE_CATEGORIES.items():
            if any(kw in content_lower for kw in keywords):
                category = cat
                break
        
        timeline.append({
            "id": memory_id,
            "fact": content,
            "category": category,
            "learnedAt": created or datetime.now(timezone.utc).isoformat(),
            "source": mem.get("metadata", {}).get("source", "conversation"),
        })
    
    # Sort by date (newest first)
    timeline.sort(key=lambda x: x.get("learnedAt", ""), reverse=True)
    
    return timeline


async def _save_profile(user_id: str, profile_data: dict[str, Any]) -> bool:
    """Save consolidated profile to PostgreSQL via API gateway."""
    api_url = settings.api_gateway_url
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{api_url}/api/v1/memory/profile",
                json=profile_data,
            )
            if response.status_code in (200, 201):
                logger.info("profile_saved", user_id=user_id)
                return True
            else:
                logger.warning(
                    "profile_save_failed",
                    user_id=user_id,
                    status=response.status_code,
                    body=response.text[:200],
                )
                return False
    except Exception as e:
        logger.error("profile_save_error", user_id=user_id, error=str(e))
        return False
