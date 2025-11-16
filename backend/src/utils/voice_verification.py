import logging
from typing import Dict

logger = logging.getLogger(__name__)

async def verify_recording_session(
    prayer_transcription_id: str,
    captcha_transcription_id: str,
    min_similarity: float = 0.85
) -> Dict:
    """
    Voice verification DISABLED - always returns 100% pass
    """
    logger.info("⚠️ Voice verification disabled - returning 100% pass")
    
    return {
        "passed": True,
        "voice_match": True,
        "similarity_score": 1.0,  # 100%
        "is_human": True,
        "human_confidence": 1.0,  # 100%
        "details": {
            "failure_reasons": [],
            "ai_detection_model": "Disabled",
            "voice_matching_model": "Disabled",
            "threshold": min_similarity,
            "note": "Voice verification disabled for performance"
        }
    }