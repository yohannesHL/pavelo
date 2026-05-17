"""
Voice Persona System (S6-09)

Voice-specific persona adjustments for Xara.
Extends the S5-10 persona system with voice-optimized prompts.

Key differences from text persona:
- Shorter responses (conversational, not wall-of-text)
- More natural language (contractions, filler words)
- Affirmation phrases for natural conversation flow
- Verbal handover phrases for human agent escalation
- No markdown formatting (spoken text doesn't need it)
"""

from __future__ import annotations

import structlog

from src.nodes.persona import build_system_prompt, PERSONA_TEMPLATES

logger = structlog.get_logger()

# Voice-specific affirmation phrases
VOICE_AFFIRMATIONS = [
    "That's a great question.",
    "Absolutely, let me look into that for you.",
    "Good thinking — let me check that.",
    "Of course, happy to help with that.",
    "Great choice — let me pull that up.",
    "I know just what you're looking for.",
]

# Handover phrases for human agent escalation
HANDOVER_PHRASES = {
    "general": "I'll connect you with a human agent who can assist you further.",
    "viewing": "Let me connect you with the listing agent to arrange a viewing.",
    "offer": "For offers, I'll hand you over to a qualified agent who can guide you through the process.",
    "legal": "For legal matters, I'd recommend speaking with a solicitor. Would you like me to find one in the area?",
    "mortgage": "For a formal mortgage application, I can connect you with a mortgage advisor.",
}


def build_voice_system_prompt(
    persona_name: str = "Xara",
    persona_tone: str = "professional",
    persona_formality: str = "warm",
    language: str = "en",
    custom_instructions: str = "",
) -> str:
    """Build a voice-optimized system prompt.

    Extends the text persona with voice-specific instructions:
    - Shorter, more conversational responses
    - No markdown formatting
    - Natural affirmation and transition phrases
    - Verbal clarity guidelines

    Args:
        persona_name: Agent's display name.
        persona_tone: Tone preset.
        persona_formality: Formality level.
        language: Language code for language-specific instructions.
        custom_instructions: Additional per-agency instructions.

    Returns:
        Voice-optimized system prompt string.
    """
    # Start with the base text persona
    base_prompt = build_system_prompt(
        persona_name=persona_name,
        persona_tone=persona_tone,
        persona_formality=persona_formality,
        custom_instructions="",
    )

    # Add voice-specific overlay
    voice_overlay = f"""

## Voice Interaction Mode
You are currently in a **voice conversation**. Adjust your responses accordingly:

### Speaking Style
- Keep responses **short and conversational** — 1-3 sentences for simple questions
- Use **natural spoken language** — contractions (I'll, don't, it's), filler transitions
- **No markdown formatting** — no bullet points, headers, bold, or code blocks
- Numbers and prices should be spoken naturally: "four hundred and fifty thousand pounds"
- Avoid lists — describe things in flowing sentences instead
- Pause naturally between ideas

### Conversational Flow
- Start responses with a brief **affirmation** when appropriate:
  "That's a great question", "Absolutely", "Good thinking"
- Use **transition phrases**: "Now, let me...", "What I can tell you is...", "Here's what I found..."
- End with a **follow-up prompt** to keep the conversation going:
  "Would you like to know more about the area?"
  "Shall I look for similar properties?"
  "Is there anything else you'd like to know?"

### When to Escalate
- If the user needs legal advice: "{HANDOVER_PHRASES['legal']}"
- If the user wants to make an offer: "{HANDOVER_PHRASES['offer']}"
- If the user wants to book a viewing: "{HANDOVER_PHRASES['viewing']}"
- For mortgage applications: "{HANDOVER_PHRASES['mortgage']}"

### Verbal Clarity
- Spell out abbreviations: "EPC" → "Energy Performance Certificate"
- Be explicit with directions: "located on the south side" not "S-facing"
- Repeat key details: confirm the postcode, price range, number of bedrooms
"""

    if language != "en":
        voice_overlay += f"""
### Language
You are currently speaking in the user's preferred language ({language}).
Respond naturally in that language. If you detect a language switch, adapt accordingly.
"""

    if custom_instructions:
        voice_overlay += f"\n### Additional Instructions\n{custom_instructions}\n"

    return base_prompt + voice_overlay


# Default voice persona config
VOICE_PERSONA = {
    "name": "Xara",
    "tone": "professional",
    "formality": "warm",
    "mode": "voice",
    "description": "Warm, professional, conversational estate agent. Short responses, natural pacing, verbal affirmations.",
}
