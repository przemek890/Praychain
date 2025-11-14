from fastapi import APIRouter, HTTPException
import logging
from typing import Optional
from difflib import SequenceMatcher

from src.utils.mongodb import get_database
from src.models.prayer import PrayerAnalysisRequest, DualAnalysisRequest, DualAnalysisResponse
from src.config import (
    CAPTCHA_ACCURACY_THRESHOLD,
    LOW_TEXT_ACCURACY_THRESHOLD,
    LOW_TEXT_ACCURACY_PENALTY,
    ACCURACY_POINTS_MULTIPLIER,
    STABILITY_POINTS_MULTIPLIER,
    FLUENCY_POINTS_MULTIPLIER,
    FOCUS_POINTS_MULTIPLIER
)

router = APIRouter(prefix="/api/prayer", tags=["prayer"])
logger = logging.getLogger(__name__)

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
        
        transcribed_text = transcription.get("text", "").strip()
        
        if not transcribed_text or len(transcribed_text) < 10:
            return {
                "analysis": {
                    "focus_score": 0.0,
                    "engagement_score": 0.0,
                    "sentiment": "neutral",
                    "text_accuracy": 0.0,
                    "captcha_accuracy": 0.0,
                    "emotional_stability": 0.0,
                    "speech_fluency": 0.0,
                    "is_focused": False,
                    "reason": "No prayer detected - silence or too short"
                },
                "bible_reference": bible_reference,
                "user_id": request.user_id,
                "captcha_passed": False
            }
        
        full_text = f"{request.bible_text}\n{request.captcha_text}"
        
        from src.routers.analysis import analyze_transcription_with_reference
        
        analysis_response = await analyze_transcription_with_reference(
            transcription_id=transcription_id,
            reference_text=full_text,
            user_id=request.user_id
        )
        
        text_accuracy = getattr(analysis_response, 'text_accuracy', 0.0)
        emotional_stability = getattr(analysis_response, 'emotional_stability', 0.0)
        speech_fluency = getattr(analysis_response, 'speech_fluency', 0.0)
        focus_score = analysis_response.focus_score
        
        captcha_transcribed = transcribed_text.split()[-len(request.captcha_text.split()):]
        captcha_transcribed_text = " ".join(captcha_transcribed).lower()
        captcha_reference = request.captcha_text.lower()
        
        captcha_accuracy = SequenceMatcher(None, captcha_transcribed_text, captcha_reference).ratio()
        captcha_passed = captcha_accuracy >= CAPTCHA_ACCURACY_THRESHOLD
        
        return {
            "analysis": {
                "focus_score": focus_score,
                "engagement_score": analysis_response.engagement_score,
                "sentiment": analysis_response.sentiment,
                "text_accuracy": text_accuracy,
                "captcha_accuracy": captcha_accuracy,
                "emotional_stability": emotional_stability,
                "speech_fluency": speech_fluency,
                "is_focused": getattr(analysis_response, 'is_focused', False),
            },
            "bible_reference": bible_reference,
            "user_id": request.user_id,
            "captcha_passed": captcha_passed,
            "captcha_threshold": CAPTCHA_ACCURACY_THRESHOLD,
            "message": "Captcha passed - call /tokens/award to earn tokens" if captcha_passed else f"Captcha failed ({captcha_accuracy * 100:.0f}%) - 0 tokens"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing prayer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing prayer: {str(e)}")

@router.get("/history")
async def get_prayer_history(skip: int = 0, limit: int = 10):
    db = get_database()
    
    analyses = await db.analyses.find().skip(skip).limit(limit).to_list(length=limit)
    
    history = []
    for analysis in analyses:
        focus_bonus = int(analysis["focus_score"] * 20)
        engagement_bonus = int(analysis["engagement_score"] * 15)
        sentiment_bonus = 5 if analysis["sentiment"] == "positive" else 0
        total_tokens = 10 + focus_bonus + engagement_bonus + sentiment_bonus
        
        history.append({
            "id": analysis["_id"],
            "tokens_earned": total_tokens,
            "sentiment": analysis["sentiment"],
            "created_at": analysis["created_at"]
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
        10 + int(a["focus_score"] * 20) + int(a["engagement_score"] * 15) + 
        (5 if a["sentiment"] == "positive" else 0)
        for a in analyses
    )
    
    avg_focus = sum(a["focus_score"] for a in analyses) / len(analyses) if analyses else 0
    avg_engagement = sum(a["engagement_score"] for a in analyses) / len(analyses) if analyses else 0
    
    return {
        "total_prayers": total_prayers,
        "total_tokens_earned": total_tokens,
        "average_focus_score": round(avg_focus, 2),
        "average_engagement_score": round(avg_engagement, 2)
    }

@router.post("/analyze-dual", response_model=DualAnalysisResponse)
async def analyze_dual_transcription(request: DualAnalysisRequest) -> DualAnalysisResponse:
    try:
        db = get_database()
        
        prayer_trans = await db.transcriptions.find_one({"_id": request.prayer_transcription_id})
        captcha_trans = await db.transcriptions.find_one({"_id": request.captcha_transcription_id})
        
        if not prayer_trans or not captcha_trans:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        prayer_text = prayer_trans.get("text", "").strip()
        captcha_transcribed = captcha_trans.get("text", "").strip()
        
        logger.info(f"Prayer text: {prayer_text[:100]}...")
        logger.info(f"Captcha transcribed: {captcha_transcribed}")
        logger.info(f"Captcha reference: {request.captcha_text}")
        
        from src.routers.analysis import analyze_transcription_with_reference
        
        try:
            analysis_dict = await analyze_transcription_with_reference(
                transcription_id=request.prayer_transcription_id,
                reference_text=request.bible_text,
                user_id=request.user_id
            )
            
            text_accuracy = analysis_dict.get('text_accuracy', 0.0)
            emotional_stability = analysis_dict.get('emotional_stability', 0.0)
            speech_fluency = analysis_dict.get('speech_fluency', 0.0)
            focus_score = analysis_dict.get('focus_score', 0.0)
            engagement_score = analysis_dict.get('engagement_score', 0.0)
            sentiment = analysis_dict.get('sentiment', 'neutral')
            is_focused = analysis_dict.get('is_focused', False)
            
        except Exception as e:
            logger.error(f"Error in prayer analysis: {e}")
            text_accuracy = 0.0
            emotional_stability = 0.0
            speech_fluency = 0.0
            focus_score = 0.0
            engagement_score = 0.0
            sentiment = "neutral"
            is_focused = False
        
        captcha_accuracy = SequenceMatcher(
            None, 
            captcha_transcribed.lower(), 
            request.captcha_text.lower()
        ).ratio()
        
        captcha_passed = captcha_accuracy >= CAPTCHA_ACCURACY_THRESHOLD
        
        logger.info(f"Captcha accuracy: {captcha_accuracy:.2f} - {'PASSED' if captcha_passed else 'FAILED'}")
        
        if captcha_passed:
            accuracy_points = text_accuracy * ACCURACY_POINTS_MULTIPLIER
            stability_points = emotional_stability * STABILITY_POINTS_MULTIPLIER
            fluency_points = speech_fluency * FLUENCY_POINTS_MULTIPLIER
            focus_points = focus_score * FOCUS_POINTS_MULTIPLIER
            
            tokens_earned = int(accuracy_points + stability_points + fluency_points + focus_points)
            
            if text_accuracy < LOW_TEXT_ACCURACY_THRESHOLD:
                tokens_earned = max(0, tokens_earned - LOW_TEXT_ACCURACY_PENALTY)
            
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
            
            logger.info(f"Awarded {tokens_earned} tokens to user {request.user_id}")
            message = f"Success! You earned {tokens_earned} tokens"
        else:
            tokens_earned = 0
            logger.info(f"CAPTCHA failed - 0 tokens awarded")
            message = f"Captcha failed ({captcha_accuracy * 100:.0f}%) - 0 tokens"
        
        return DualAnalysisResponse(
            analysis={
                "focus_score": float(focus_score),
                "engagement_score": float(engagement_score),
                "sentiment": str(sentiment),
                "text_accuracy": float(text_accuracy),
                "captcha_accuracy": float(captcha_accuracy),
                "emotional_stability": float(emotional_stability),
                "speech_fluency": float(speech_fluency),
                "is_focused": bool(is_focused),
                "tokens_earned": tokens_earned,
            },
            captcha_passed=captcha_passed,
            user_id=request.user_id,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in dual analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing prayer: {str(e)}")
