"""
Pavelo Agent — LangGraph State Schema

Typed state for the Xara AI agent's conversation graph.
This state flows through all nodes in the LangGraph StateGraph.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal
from langchain_core.messages import BaseMessage


@dataclass
class AgentState:
    """Full state schema for the Xara agent graph.

    Attributes:
        user_id: Authenticated user ID (from Supabase Auth).
        session_id: Conversation session ID.
        messages: Conversation message history (LangChain message objects).
        memory_context: Retrieved episodic memories from Mem0.
        active_search_params: Current property search parameters being refined.
        tool_results: Results from tool executions in this turn.
        properties_shown: IDs of properties already shown to avoid repetition.
        agent_persona: Persona name (default: "xara").
        intent: Classified user intent for the current turn.
        user_preferences: Stored user preferences from profile.
        error: Error message if something went wrong.
    """

    user_id: str = ""
    session_id: str = ""
    messages: list[BaseMessage] = field(default_factory=list)
    memory_context: dict[str, Any] = field(default_factory=dict)
    active_search_params: dict[str, Any] = field(default_factory=dict)
    tool_results: list[dict[str, Any]] = field(default_factory=list)
    properties_shown: list[str] = field(default_factory=list)
    agent_persona: str = "xara"
    intent: str = ""
    user_preferences: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


# Intent types the classifier can produce
IntentType = Literal[
    "property_search",
    "property_detail",
    "area_inquiry",
    "valuation_request",
    "booking_request",
    "comparison",
    "general_question",
    "greeting",
    "farewell",
    "clarification",
    "unknown",
]
