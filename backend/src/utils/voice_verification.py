import logging
import httpx
from typing import Dict

from src.config import settings

logger = logging.getLogger(__name__)

async def verify_recording_session(
    prayer_transcription_id: str,
    captcha_transcription_id: str,
    min_similarity: float = None
) -> Dict:
    """
    Voice verification using external voice-service (if enabled)
    """
    from src.utils.mongodb import get_database
    
    if min_similarity is None:
        min_similarity = settings.VOICE_SIMILARITY_THRESHOLD
    
    # If voice verification is disabled, return success
    if not settings.VOICE_VERIFICATION_ENABLED:
        logger.info("Voice verification disabled - skipping")
        return {
            "passed": True,
            "voice_match": True,
            "similarity_score": 1.0,
            "is_human": True,
            "human_confidence": 1.0,
            "details": {
                "failure_reasons": [],
                "ai_detection_model": "Disabled",
                "voice_matching_model": "Disabled",
                "threshold": min_similarity,
                "note": "Voice verification is disabled in configuration"
            }
        }
    
    db = get_database()
    
    try:
        # Get audio file paths
        prayer_trans = await db.transcriptions.find_one({"_id": prayer_transcription_id})
        captcha_trans = await db.transcriptions.find_one({"_id": captcha_transcription_id})
        
        if not prayer_trans or not captcha_trans:
            logger.error("Missing transcription data")
            return {
                "passed": False,
                "voice_match": False,
                "similarity_score": 0.0,
                "is_human": False,
                "human_confidence": 0.0,
                "details": {
                    "failure_reasons": ["Missing audio files"],
                    "ai_detection_model": "N/A",
                    "voice_matching_model": "speechbrain/spkrec-ecapa-voxceleb",
                    "threshold": min_similarity
                }
            }
        
        prayer_path = prayer_trans.get("file_path")
        captcha_path = captcha_trans.get("file_path")
        
        logger.info(f"Verifying voice: {prayer_path} vs {captcha_path}")
        logger.info(f"Using voice service at: {settings.VOICE_SERVICE_URL}")
        
        # Call voice-service
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.VOICE_SERVICE_URL}/verify",
                json={
                    "audio_path_1": prayer_path,
                    "audio_path_2": captcha_path,
                    "threshold": min_similarity
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Voice service error: {response.status_code} - {response.text}")
            
            result = response.json()
            
            similarity_score = result["similarity_score"]
            is_same_speaker = result["is_same_speaker"]
            
            logger.info(f"Voice verification result: {similarity_score:.4f}, Same: {is_same_speaker}")
            
            return {
                "passed": is_same_speaker,
                "voice_match": is_same_speaker,
                "similarity_score": similarity_score,
                "is_human": is_same_speaker,
                "human_confidence": 1.0,
                "details": {
                    "failure_reasons": [] if is_same_speaker else ["Voice mismatch"],
                    "ai_detection_model": "Implicit (voice similarity)",
                    "voice_matching_model": "speechbrain/spkrec-ecapa-voxceleb",
                    "threshold": min_similarity,
                    "confidence": result.get("confidence", 0.0),
                    "service_url": settings.VOICE_SERVICE_URL
                }
            }
            
    except Exception as e:
        logger.error(f"Voice verification failed: {str(e)}")
        return {
            "passed": False,
            "voice_match": False,
            "similarity_score": 0.0,
            "is_human": False,
            "human_confidence": 0.0,
            "details": {
                "failure_reasons": [str(e)],
                "ai_detection_model": "Error",
                "voice_matching_model": "speechbrain/spkrec-ecapa-voxceleb",
                "threshold": min_similarity,
                "service_url": settings.VOICE_SERVICE_URL
            }
        }