"""Pavelo Agent Service — AI orchestration with LangGraph (S5-04, S5-06)."""

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional
import json
import uuid

import structlog
from langchain_core.messages import HumanMessage

from src.config import settings
from src.graph import agent_graph
from src.state import AgentState
from src.nodes.response_generator import response_generator_stream, _build_visual_payloads

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    logger.info("agent_service_starting", port=settings.port)
    yield
    logger.info("agent_service_stopping")


app = FastAPI(
    title="Pavelo Agent Service",
    version="0.2.0",
    description="AI Agent orchestration service for Pavelo/Xara",
    lifespan=lifespan,
)


# --- Request / Response Models ---

class ChatRequest(BaseModel):
    """Chat request from the API gateway."""
    user_id: str
    conversation_id: str
    message: str
    stream: bool = True
    persona_name: Optional[str] = None
    persona_tone: Optional[str] = None


class ChatResponse(BaseModel):
    """Non-streaming chat response."""
    response: str
    intent: str
    visual_payloads: list = []
    conversation_id: str


# --- Endpoints ---

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "agent",
        "version": "0.2.0",
    }


@app.post("/api/v1/chat")
async def chat(request: ChatRequest):
    """Process a chat message through the LangGraph agent.

    Supports both streaming (SSE) and non-streaming responses.

    The agent pipeline:
    1. Memory retrieval (Mem0 episodic memory)
    2. Intent classification (OpenAI)
    3. Tool execution (search, details, comparison, mortgage)
    4. Response generation (OpenAI with full context)
    5. Memory write (persist new facts to Mem0)
    """
    logger.info(
        "chat_request",
        user_id=request.user_id,
        conversation_id=request.conversation_id,
        message_preview=request.message[:100],
        stream=request.stream,
    )

    # Build initial state
    initial_state = AgentState(
        user_id=request.user_id,
        session_id=request.conversation_id,
        messages=[HumanMessage(content=request.message)],
    )

    config = {"configurable": {"thread_id": request.conversation_id}}

    if request.stream:
        return StreamingResponse(
            _stream_response(initial_state, config, request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    # Non-streaming response
    try:
        result = await agent_graph.ainvoke(initial_state, config=config)

        # Extract response from the last AI message
        response_text = ""
        if result.messages:
            last_msg = result.messages[-1]
            if hasattr(last_msg, "content"):
                response_text = last_msg.content

        visual_payloads = getattr(result, "visual_payloads", [])

        return ChatResponse(
            response=response_text,
            intent=result.intent,
            visual_payloads=visual_payloads,
            conversation_id=request.conversation_id,
        )

    except Exception as e:
        logger.error("chat_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


async def _stream_response(state: AgentState, config: dict, request: ChatRequest):
    """SSE streaming generator.

    Runs the agent graph for memory retrieval, intent classification,
    and tool execution, then streams the response tokens.

    Yields SSE events:
      data: {"type": "token", "content": "..."}
      data: {"type": "visual_payload", "payload": {...}}
      data: {"type": "done"}
      data: [DONE]
    """
    try:
        # Run the graph up to (but not including) response generation
        # We need memory + intent + tools before streaming
        result = await agent_graph.ainvoke(state, config=config)

        # Build visual payloads from tool results
        visual_payloads = getattr(result, "visual_payloads", [])

        # Send visual payloads first
        for vp in visual_payloads:
            yield f"data: {json.dumps({'type': 'visual_payload', 'payload': vp})}\n\n"

        # Extract the response text from the result
        response_text = ""
        if result.messages:
            last_msg = result.messages[-1]
            if hasattr(last_msg, "content"):
                response_text = last_msg.content

        # Stream the response text token by token
        if response_text:
            # Simulate token-by-token streaming from the pre-generated response
            # In a full implementation, this would use the streaming OpenAI call directly
            words = response_text.split(" ")
            for i, word in enumerate(words):
                token = word if i == 0 else " " + word
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        yield "data: [DONE]\n\n"

    except Exception as e:
        logger.error("stream_error", error=str(e))
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        yield "data: [DONE]\n\n"


@app.post("/api/v1/chat/stream")
async def chat_stream(request: ChatRequest):
    """Explicit streaming endpoint (SSE).

    Alternative to the main /api/v1/chat endpoint with stream=true.
    """
    request.stream = True
    return await chat(request)
