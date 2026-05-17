"""
Pavelo Agent — LangGraph State Machine Definition (S5-04)

The Xara agent graph defines the flow of conversation processing:

  START → memory_retrieval → intent_classifier → [route by intent]
    → property_search / tool_executor / response_generator
    → memory_writer → END

All nodes are async for proper OpenAI and Mem0 integration.
Checkpointing is configured for conversation persistence.
"""

from __future__ import annotations

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from src.state import AgentState
from src.nodes.memory_retrieval import memory_retrieval_node
from src.nodes.intent_classifier import intent_classifier_node
from src.nodes.property_search import property_search_node
from src.nodes.response_generator import response_generator_node
from src.nodes.memory_writer import memory_writer_node
from src.nodes.tool_executor import tool_executor_node
from src.nodes.handover import handover_escalation_node


def route_by_intent(state: AgentState) -> str:
    """Route to the appropriate node based on classified intent."""
    search_intents = {"property_search"}
    tool_intents = {"comparison", "property_detail", "valuation_request", "booking_request"}
    handover_intents = {"human_handover"}

    if state.intent in handover_intents:
        return "handover_escalation"
    if state.intent in search_intents:
        return "property_search"
    if state.intent in tool_intents:
        return "tool_executor"
    return "response_generator"


def build_agent_graph() -> StateGraph:
    """Build and compile the Xara agent graph.

    Returns:
        Compiled LangGraph StateGraph ready for invocation.
    """
    graph = StateGraph(AgentState)

    # --- Add Nodes ---
    graph.add_node("memory_retrieval", memory_retrieval_node)
    graph.add_node("intent_classifier", intent_classifier_node)
    graph.add_node("property_search", property_search_node)
    graph.add_node("tool_executor", tool_executor_node)
    graph.add_node("response_generator", response_generator_node)
    graph.add_node("memory_writer", memory_writer_node)
    graph.add_node("handover_escalation", handover_escalation_node)

    # --- Define Edges ---
    graph.set_entry_point("memory_retrieval")
    graph.add_edge("memory_retrieval", "intent_classifier")

    # Conditional routing after intent classification
    graph.add_conditional_edges(
        "intent_classifier",
        route_by_intent,
        {
            "property_search": "property_search",
            "tool_executor": "tool_executor",
            "response_generator": "response_generator",
            "handover_escalation": "handover_escalation",
        },
    )

    # After search or tools, generate a response
    graph.add_edge("property_search", "response_generator")
    graph.add_edge("tool_executor", "response_generator")
    graph.add_edge("handover_escalation", "response_generator")

    # After response, write memories
    graph.add_edge("response_generator", "memory_writer")

    # End after memory write
    graph.add_edge("memory_writer", END)

    # --- Checkpointing ---
    checkpointer = MemorySaver()

    return graph.compile(checkpointer=checkpointer)


# Module-level compiled graph instance
agent_graph = build_agent_graph()
