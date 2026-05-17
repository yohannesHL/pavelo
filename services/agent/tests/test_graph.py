"""
Test harness for the Xara agent graph.

Tests the basic flow: memory_retrieval → intent_classifier
→ property_search/response_generator → memory_writer
"""

from __future__ import annotations

import pytest
from langchain_core.messages import HumanMessage

from src.state import AgentState


class TestAgentState:
    """Test the AgentState dataclass."""

    def test_default_state(self):
        state = AgentState()
        assert state.user_id == ""
        assert state.session_id == ""
        assert state.messages == []
        assert state.memory_context == {}
        assert state.agent_persona == "xara"
        assert state.intent == ""
        assert state.error is None

    def test_state_with_values(self):
        state = AgentState(
            user_id="user-123",
            session_id="session-456",
            messages=[HumanMessage(content="Hello")],
            agent_persona="xara",
        )
        assert state.user_id == "user-123"
        assert len(state.messages) == 1
        assert state.messages[0].content == "Hello"


class TestIntentClassifier:
    """Test the intent classifier node."""

    def test_greeting_intent(self):
        from src.nodes.intent_classifier import intent_classifier_node

        state = AgentState(
            messages=[HumanMessage(content="Hello Xara!")],
        )
        result = intent_classifier_node(state)
        assert result["intent"] == "greeting"

    def test_search_intent(self):
        from src.nodes.intent_classifier import intent_classifier_node

        state = AgentState(
            messages=[HumanMessage(content="Find me a 3 bedroom house in London")],
        )
        result = intent_classifier_node(state)
        assert result["intent"] == "property_search"

    def test_farewell_intent(self):
        from src.nodes.intent_classifier import intent_classifier_node

        state = AgentState(
            messages=[HumanMessage(content="Goodbye, thanks for your help!")],
        )
        result = intent_classifier_node(state)
        assert result["intent"] == "farewell"

    def test_empty_messages(self):
        from src.nodes.intent_classifier import intent_classifier_node

        state = AgentState()
        result = intent_classifier_node(state)
        assert result["intent"] == "greeting"


class TestResponseGenerator:
    """Test the response generator node."""

    def test_greeting_response(self):
        from src.nodes.response_generator import response_generator_node

        state = AgentState(
            intent="greeting",
            messages=[HumanMessage(content="Hello!")],
        )
        result = response_generator_node(state)
        assert len(result["messages"]) == 2  # original + AI response
        assert "Xara" in result["messages"][-1].content

    def test_search_response(self):
        from src.nodes.response_generator import response_generator_node

        state = AgentState(
            intent="property_search",
            messages=[HumanMessage(content="Find houses")],
            tool_results=[],
        )
        result = response_generator_node(state)
        assert len(result["messages"]) == 2


class TestMemoryRetrieval:
    """Test the memory retrieval node."""

    def test_returns_context(self):
        from src.nodes.memory_retrieval import memory_retrieval_node

        state = AgentState(user_id="test-user")
        result = memory_retrieval_node(state)
        assert "memory_context" in result
        assert "episodic_memories" in result["memory_context"]


class TestMemoryWriter:
    """Test the memory writer node."""

    def test_returns_empty(self):
        from src.nodes.memory_writer import memory_writer_node

        state = AgentState(
            user_id="test-user",
            messages=[HumanMessage(content="Hello")],
        )
        result = memory_writer_node(state)
        assert result == {}
