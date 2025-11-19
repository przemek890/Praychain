from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from difflib import SequenceMatcher
from datetime import datetime
import uuid
import logging  # ✅ DODAJ TO
import numpy as np

from src.utils.mongodb import get_database
from src.models.prayer import PrayerAnalysisRequest, DualAnalysisRequest, DualAnalysisResponse
from src.config import (
    CAPTCHA_ACCURACY_THRESHOLD,
    LOW_TEXT_ACCURACY_THRESHOLD,
    LOW_TEXT_ACCURACY_PENALTY,
    ACCURACY_POINTS_MULTIPLIER,
    STABILITY_POINTS_MULTIPLIER,
    FLUENCY_POINTS_MULTIPLIER,
    FOCUS_POINTS_MULTIPLIER,
    VOICE_SERVICE_URL,
    VOICE_SIMILARITY_THRESHOLD,
    VOICE_SIMILARITY_BONUS_MULTIPLIER,
)
from src.utils.voice_verification import verify_recording_session

router = APIRouter(prefix="/api/prayer", tags=["prayer"])
logger = logging.getLogger(__name__)

# Import funkcji z analysis.py
from src.routers.analysis import (
    analyze_emotion_api,
    calculate_text_accuracy,
    analyze_emotional_stability,
    analyze_speech_fluency,
    calculate_prayer_focus_score
)

@router.post("/analyze/{transcription_id}")
async def analyze_prayer_reading(
    transcription_id: str,
    request: PrayerAnalysisRequest,
    bible_reference: Optional[str] = None
):
    try:
        db = get_database()
        transcription = await db.transcriptions.find_one({"_id": transcription_id})
        
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        prayer_text = transcription["text"]
        
        emotions = analyze_emotion_api(prayer_text)
        text_accuracy = calculate_text_accuracy(prayer_text, request.bible_text)
        emotional_stability = analyze_emotional_stability(emotions)
        speech_fluency = analyze_speech_fluency(prayer_text)
        focus_score = calculate_prayer_focus_score(text_accuracy, emotional_stability, speech_fluency)
        
        analysis = {
            "transcription_id": transcription_id,
            "emotions": emotions,
            "focus_score": focus_score,
            "text_accuracy": text_accuracy,
            "emotional_stability": emotional_stability,
            "speech_fluency": speech_fluency,
            "created_at": datetime.utcnow()
        }
        
        await db.analyses.insert_one(analysis)
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing prayer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_prayer_history(skip: int = 0, limit: int = 10):
    db = get_database()
    
    analyses = await db.analyses.find().skip(skip).limit(limit).to_list(length=limit)
    
    history = []
    for analysis in analyses:
        history.append({
            "id": analysis.get("_id"),
            "focus_score": analysis.get("focus_score", 0),
            "text_accuracy": analysis.get("text_accuracy", 0),
            "created_at": analysis.get("created_at")
        })
    
    return {
        "total": await db.analyses.count_documents({}),
        "prayers": history
    }

@router.get("/stats")
async def get_prayer_stats():
    db = get_database()
    
    total_prayers = await db.analyses.count_documents({})
    
    analyses = await db.analyses.find().to_list(length=None)
    total_tokens = sum(
        10 + int(a.get("focus_score", 0) * 20) + int(a.get("engagement_score", 0) * 15) + 
        (5 if a.get("sentiment") == "positive" else 0)
        for a in analyses
    )
    
    avg_focus = sum(a.get("focus_score", 0) for a in analyses) / len(analyses) if analyses else 0
    avg_engagement = sum(a.get("engagement_score", 0) for a in analyses) / len(analyses) if analyses else 0
    
    return {
        "total_prayers": total_prayers,
        "total_tokens_earned": total_tokens,
        "average_focus_score": round(avg_focus, 2),
        "average_engagement_score": round(avg_engagement, 2)
    }

@router.post("/analyze-dual", response_model=DualAnalysisResponse)
async def analyze_dual_transcription(request: DualAnalysisRequest, lang: str = Query("en", regex="^(en|pl|es)$")):
    """
    Analiza modlitwy i weryfikacja głosu z obsługą języka
    """
    try:
        db = get_database()
        
        # Get transcriptions FIRST for text analysis
        prayer_transcription = await db.transcriptions.find_one({"_id": request.prayer_transcription_id})
        captcha_transcription = await db.transcriptions.find_one({"_id": request.captcha_transcription_id})
        
        if not prayer_transcription or not captcha_transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        prayer_text = prayer_transcription["text"]
        captcha_transcribed = captcha_transcription["text"]
        
        logger.info(f"Analyzing prayer: {prayer_text[:100]}...")
        logger.info(f"Captcha transcribed: {captcha_transcribed}")
        logger.info(f"Captcha expected: {request.captcha_text}")
        
        # ========================================
        # ANALYZE TEXT FIRST (before voice check)
        # ========================================
        try:
            # Emotion analysis
            emotions = analyze_emotion_api(prayer_text)
            
            # Calculate metrics using imported functions
            text_accuracy = calculate_text_accuracy(prayer_text, request.bible_text)
            emotional_stability = analyze_emotional_stability(emotions)
            speech_fluency = analyze_speech_fluency(prayer_text)
            focus_score = calculate_prayer_focus_score(text_accuracy, emotional_stability, speech_fluency)
            
            # Engagement score (simplified)
            engagement_score = (emotions.get("joy", 0) * 0.5 + 
                              emotions.get("neutral", 0) * 0.3 + 
                              (1.0 - emotions.get("anger", 0)) * 0.2)
            
            is_focused = focus_score >= 0.5
            
            logger.info(f"Prayer Analysis - Focus: {focus_score:.2f}, Accuracy: {text_accuracy:.2f}, "
                       f"Stability: {emotional_stability:.2f}, Fluency: {speech_fluency:.2f}")
            
        except Exception as e:
            logger.error(f"Error in prayer analysis: {e}")
            text_accuracy = 0.0
            emotional_stability = 0.0
            speech_fluency = 0.0
            focus_score = 0.0
            engagement_score = 0.0
            is_focused = False
        
        # Calculate captcha accuracy
        captcha_accuracy = SequenceMatcher(
            None, 
            captcha_transcribed.lower().strip(), 
            request.captcha_text.lower().strip()
        ).ratio()
        
        captcha_passed = captcha_accuracy >= CAPTCHA_ACCURACY_THRESHOLD
        
        logger.info(f"Captcha accuracy: {captcha_accuracy:.2f} - {'PASSED' if captcha_passed else 'FAILED'}")
        
        # ========================================
        # VOICE VERIFICATION (if captcha passed)
        # ========================================
        voice_verification = await verify_recording_session(
            prayer_transcription_id=request.prayer_transcription_id,
            captcha_transcription_id=request.captcha_transcription_id,
            min_similarity=VOICE_SIMILARITY_THRESHOLD
        )
        
        if not voice_verification.get("passed", False):
            failure_reasons = voice_verification.get("details", {}).get("failure_reasons", [])
            
            logger.warning(f"Verification failed: {failure_reasons}")
            
            # ✅ KONWERTUJ numpy typy na Python typy
            verification_result_clean = {
                "passed": bool(voice_verification.get("passed", False)),
                "voice_match": bool(voice_verification.get("voice_match", False)),
                "similarity_score": float(voice_verification.get("similarity_score", 0.0)),
                "is_human": bool(voice_verification.get("is_human", False)),
                "human_confidence": float(voice_verification.get("human_confidence", 0.0)),
                "details": {
                    "failure_reasons": failure_reasons,
                    "ai_detection_model": voice_verification.get("details", {}).get("ai_detection_model", ""),
                    "voice_matching_model": voice_verification.get("details", {}).get("voice_matching_model", ""),
                    "threshold": float(voice_verification.get("details", {}).get("threshold", 0.0)),
                    "ai_detection_details": {
                        k: float(v) if isinstance(v, (np.number, np.floating, np.integer)) else v
                        for k, v in voice_verification.get("details", {}).get("ai_detection_details", {}).items()
                    }
                }
            }
            
            # Log fraud attempt
            fraud_log = {
                "_id": str(uuid.uuid4()),
                "user_id": request.user_id,
                "prayer_transcription_id": request.prayer_transcription_id,
                "captcha_transcription_id": request.captcha_transcription_id,
                "verification_result": verification_result_clean,  # ✅ Cleaned data
                "failure_reasons": failure_reasons,
                "timestamp": datetime.now(),
                "type": "voice_verification_failed"
            }
            
            try:
                await db.fraud_logs.insert_one(fraud_log)
                logger.info(f"Fraud attempt logged for user {request.user_id}")
            except Exception as e:
                logger.error(f"Failed to log fraud attempt: {e}")
            
            # ✅ ZWRÓĆ 0 TOKENÓW (nie rzucaj błędu!)
            return DualAnalysisResponse(
                analysis={
                    "focus_score": float(focus_score),
                    "engagement_score": float(engagement_score),
                    "text_accuracy": float(text_accuracy),
                    "captcha_accuracy": float(captcha_accuracy),
                    "emotional_stability": float(emotional_stability),
                    "speech_fluency": float(speech_fluency),
                    "tokens_earned": 0,  # ❌ 0 tokenów
                },
                captcha_passed=False,
                user_id=request.user_id,
                message=f"Verification failed: {', '.join(failure_reasons)}",
                voice_verified=False,
                voice_similarity=float(voice_verification.get("similarity_score", 0.0)),
                is_human=bool(voice_verification.get("is_human", False)),
                human_confidence=float(voice_verification.get("human_confidence", 0.0))
            )
        
        # ========================================
        # AWARD TOKENS (if everything passed)
        # ========================================
        if captcha_passed:
            accuracy_points = text_accuracy * ACCURACY_POINTS_MULTIPLIER
            stability_points = emotional_stability * STABILITY_POINTS_MULTIPLIER
            fluency_points = speech_fluency * FLUENCY_POINTS_MULTIPLIER
            focus_points = focus_score * FOCUS_POINTS_MULTIPLIER
            
            voice_bonus = voice_verification["similarity_score"] * VOICE_SIMILARITY_BONUS_MULTIPLIER
            
            tokens_earned = int(accuracy_points + stability_points + fluency_points + focus_points + voice_bonus)
            
            if text_accuracy < LOW_TEXT_ACCURACY_THRESHOLD:
                tokens_earned = max(0, tokens_earned - LOW_TEXT_ACCURACY_PENALTY)
            
            logger.info(f"Token calculation - Accuracy: {accuracy_points:.0f}, Stability: {stability_points:.0f}, "
                       f"Fluency: {fluency_points:.0f}, Focus: {focus_points:.0f}, Voice bonus: {voice_bonus:.0f}")
            
            from src.routers.tokens import award_tokens_internal
            
            await award_tokens_internal(
                db=db,
                user_id=request.user_id,
                transcription_id=request.prayer_transcription_id,
                tokens_earned=tokens_earned,
                text_accuracy=text_accuracy,
                emotional_stability=emotional_stability,
                speech_fluency=speech_fluency,
                captcha_accuracy=captcha_accuracy,
                focus_score=focus_score
            )
            
            # ✅ NOWE: Aktualizacja salda użytkownika w tabeli users
            await db.users.update_one(
                {"_id": request.user_id},
                {
                    "$inc": {
                        "tokens_balance": tokens_earned,
                        "total_earned": tokens_earned,
                        "prayers_count": 1
                    },
                    "$set": {
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Awarded {tokens_earned} tokens to user {request.user_id}")
            message = f"Success! You earned {tokens_earned} tokens (Voice verified ✓, Human: {voice_verification['human_confidence']*100:.0f}%)"
        else:
            tokens_earned = 0
            logger.info(f"CAPTCHA failed - 0 tokens awarded")
            message = f"Captcha failed ({captcha_accuracy * 100:.0f}%) - 0 tokens"
        
        return DualAnalysisResponse(
            analysis={
                "focus_score": float(focus_score),
                "engagement_score": float(engagement_score),
                "text_accuracy": float(text_accuracy),
                "captcha_accuracy": float(captcha_accuracy),
                "emotional_stability": float(emotional_stability),
                "speech_fluency": float(speech_fluency),
                "tokens_earned": tokens_earned,
            },
            captcha_passed=captcha_passed,
            user_id=request.user_id,
            message=message,
            voice_verified=voice_verification["passed"],
            voice_similarity=float(voice_verification["similarity_score"]),
            is_human=voice_verification["is_human"],
            human_confidence=float(voice_verification["human_confidence"])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in dual analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing prayer: {str(e)}")

