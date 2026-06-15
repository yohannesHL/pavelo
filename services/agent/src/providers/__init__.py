"""
Provider adapters for LLM, STT, and TTS services.

Clean adapter pattern: each provider implements a protocol.
The factory reads env vars to decide which concrete adapter to use.

Priority:
  - If provider-specific key is set (DEEPGRAM_API_KEY, CARTESIA_API_KEY, OPENAI_API_KEY),
    use that provider directly.
  - Otherwise fall back to OpenRouter (OPENROUTER_API_KEY), which exposes
    LLM, STT, and TTS behind a single API key.
  - If nothing is configured, use stub adapters that return canned responses.
"""
