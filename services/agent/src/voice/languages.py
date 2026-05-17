"""
Multi-language Support (S6-08)

Language detection and multilingual TTS/STT configuration:
- Deepgram auto-language detection from speech
- Cartesia multilingual TTS voice selection
- Language preference stored in user profile
- Supported: English, Spanish, French, Arabic, Hindi, Mandarin
"""

from __future__ import annotations

from typing import Optional

import structlog

logger = structlog.get_logger()

# Supported languages with service configurations
SUPPORTED_LANGUAGES = {
    "en": {
        "name": "English",
        "native_name": "English",
        "deepgram_code": "en-US",
        "cartesia_voice": "a0e99841-438c-4a64-b679-ae501e7d6091",
        "cartesia_language": "en",
    },
    "es": {
        "name": "Spanish",
        "native_name": "Español",
        "deepgram_code": "es",
        "cartesia_voice": "a0e99841-438c-4a64-b679-ae501e7d6091",
        "cartesia_language": "es",
    },
    "fr": {
        "name": "French",
        "native_name": "Français",
        "deepgram_code": "fr",
        "cartesia_voice": "a0e99841-438c-4a64-b679-ae501e7d6091",
        "cartesia_language": "fr",
    },
    "ar": {
        "name": "Arabic",
        "native_name": "العربية",
        "deepgram_code": "ar",
        "cartesia_voice": "a0e99841-438c-4a64-b679-ae501e7d6091",
        "cartesia_language": "ar",
    },
    "hi": {
        "name": "Hindi",
        "native_name": "हिन्दी",
        "deepgram_code": "hi",
        "cartesia_voice": "a0e99841-438c-4a64-b679-ae501e7d6091",
        "cartesia_language": "hi",
    },
    "zh": {
        "name": "Mandarin",
        "native_name": "中文",
        "deepgram_code": "zh-CN",
        "cartesia_voice": "a0e99841-438c-4a64-b679-ae501e7d6091",
        "cartesia_language": "zh",
    },
}


def get_language_config(language_code: str) -> dict:
    """Get full language configuration for a language code.

    Args:
        language_code: ISO 639-1 code (e.g. "en", "es").

    Returns:
        Language config dict. Falls back to English if unknown.
    """
    config = SUPPORTED_LANGUAGES.get(language_code)
    if not config:
        logger.warning(
            "unknown_language",
            code=language_code,
            message=f"Falling back to English",
        )
        return SUPPORTED_LANGUAGES["en"]
    return config


def get_deepgram_language(language_code: str) -> str:
    """Get the Deepgram language code for STT.

    For auto-detection, pass "auto" or "multi" to Deepgram.
    """
    if language_code in ("auto", "multi"):
        return "multi"  # Deepgram multi-language model
    config = get_language_config(language_code)
    return config["deepgram_code"]


def get_cartesia_config(language_code: str) -> tuple[str, str]:
    """Get Cartesia voice ID and language for TTS.

    Returns:
        Tuple of (voice_id, language_code) for Cartesia.
    """
    config = get_language_config(language_code)
    return config["cartesia_voice"], config["cartesia_language"]


def detect_language_from_deepgram_response(result: dict) -> Optional[str]:
    """Extract detected language from Deepgram response metadata.

    Deepgram returns detected_language in the response when using
    the multi-language model.

    Args:
        result: Deepgram recognition result dict.

    Returns:
        ISO 639-1 language code, or None if not detected.
    """
    detected = result.get("detected_language") or result.get("language")
    if not detected:
        return None

    # Map Deepgram language codes back to our codes
    deepgram_to_iso = {
        "en-US": "en",
        "en-GB": "en",
        "en-AU": "en",
        "es": "es",
        "es-419": "es",
        "fr": "fr",
        "fr-CA": "fr",
        "ar": "ar",
        "hi": "hi",
        "zh-CN": "zh",
        "zh-TW": "zh",
    }

    iso = deepgram_to_iso.get(detected, detected[:2] if len(detected) >= 2 else None)

    if iso and iso in SUPPORTED_LANGUAGES:
        return iso

    logger.debug("unsupported_detected_language", detected=detected)
    return None
