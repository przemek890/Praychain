from fastapi import APIRouter, HTTPException
import logging
from typing import Optional
from pydantic import BaseModel

from src.utils.mongodb import get_database
from src.routers.analysis import analyze_transcription

router = APIRouter(prefix="/api/prayer", tags=["prayer"])
logger = logging.getLogger(__name__)

class PrayerAnalysisRequest(BaseModel):
    bible_text: Optional[str] = None
    user_id: str = "default_user"

@router.post("/analyze/{transcription_id}")
async def analyze_prayer_reading(
    transcription_id: str,
    request: PrayerAnalysisRequest,
    bible_reference: Optional[str] = None
):
    """
    Analizuje modlitwę z uwzględnieniem tekstu biblijnego
    Tokeny: 0 (brak czytania) -> 100 (perfekcja)
    """
    try:
        db = get_database()
        transcription = await db.transcriptions.find_one({"_id": transcription_id})
        
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        # ✅ SPRAWDŹ CZY JEST TRANSKRYPCJA
        transcribed_text = transcription.get("text", "").strip()
        
        if not transcribed_text or len(transcribed_text) < 10:
            # Brak czytania = 0 tokenów
            logger.warning(f"Empty transcription for {transcription_id}")
            return {
                "analysis": {
                    "focus_score": 0.0,
                    "engagement_score": 0.0,
                    "sentiment": "neutral",
                    "text_accuracy": 0.0,
                    "emotional_stability": 0.0,
                    "speech_fluency": 0.0,
                    "is_focused": False,
                    "reason": "No prayer detected - silence or too short"
                },
                "tokens_earned": 0,
                "bible_reference": bible_reference,
                "user_id": request.user_id,
                "breakdown": {
                    "base": 0,
                    "accuracy_bonus": 0,
                    "stability_bonus": 0,
                    "fluency_bonus": 0,
                    "focus_bonus": 0,
                    "reason": "No transcription - 0 tokens"
                }
            }
        
        # ✅ MUSI BYĆ TEKST BIBLIJNY DO PORÓWNANIA
        if not request.bible_text:
            raise HTTPException(
                status_code=400,
                detail="Bible text reference is required for prayer analysis"
            )
        
        # Wywołaj analizę Z tekstem biblijnym
        from src.routers.analysis import analyze_transcription_with_reference
        
        analysis_response = await analyze_transcription_with_reference(
            transcription_id=transcription_id,
            reference_text=request.bible_text,
            user_id=request.user_id
        )
        
        # ✅ NOWY SYSTEM TOKENÓW: 0-100
        # Wagi: accuracy (50%), stability (25%), fluency (15%), focus (10%)
        
        text_accuracy = getattr(analysis_response, 'text_accuracy', 0.0)
        emotional_stability = getattr(analysis_response, 'emotional_stability', 0.0)
        speech_fluency = getattr(analysis_response, 'speech_fluency', 0.0)
        focus_score = analysis_response.focus_score
        
        # Oblicz tokeny (0-100)
        accuracy_points = text_accuracy * 50  # 0-50 punktów
        stability_points = emotional_stability * 25  # 0-25 punktów
        fluency_points = speech_fluency * 15  # 0-15 punktów
        focus_points = focus_score * 10  # 0-10 punktów
        
        total_tokens = int(accuracy_points + stability_points + fluency_points + focus_points)
        
        # ✅ KARA za bardzo słabe czytanie (accuracy < 0.3)
        if text_accuracy < 0.3:
            total_tokens = max(0, total_tokens - 20)
            penalty_applied = True
        else:
            penalty_applied = False
        
        total_tokens = max(0, min(100, total_tokens))  # Ogranicz do 0-100
        
        # DODAJ TOKENY DO KONTA UŻYTKOWNIKA
        from src.routers.tokens import add_tokens
        await add_tokens(request.user_id, total_tokens, f"prayer:{transcription_id}")
        
        return {
            "analysis": {
                "focus_score": focus_score,
                "engagement_score": analysis_response.engagement_score,
                "sentiment": analysis_response.sentiment,
                "text_accuracy": text_accuracy,
                "emotional_stability": emotional_stability,
                "speech_fluency": speech_fluency,
                "is_focused": getattr(analysis_response, 'is_focused', False),
            },
            "tokens_earned": total_tokens,
            "max_possible": 100,
            "bible_reference": bible_reference,
            "user_id": request.user_id,
            "breakdown": {
                "accuracy_points": round(accuracy_points, 1),
                "stability_points": round(stability_points, 1),
                "fluency_points": round(fluency_points, 1),
                "focus_points": round(focus_points, 1),
                "penalty_applied": penalty_applied,
                "explanation": "Perfect reading = 100 tokens, silence/no reading = 0 tokens"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing prayer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing prayer: {str(e)}")

@router.get("/history")
async def get_prayer_history(skip: int = 0, limit: int = 10):
    """Get user's prayer history with token earnings"""
    db = get_database()
    
    # This would be filtered by user_id in production
    analyses = await db.analyses.find().skip(skip).limit(limit).to_list(length=limit)
    
    history = []
    for analysis in analyses:
        # Recalculate tokens for display
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
    """Get overall prayer statistics"""
    db = get_database()
    
    total_prayers = await db.analyses.count_documents({})
    
    # Calculate total tokens earned
    analyses = await db.analyses.find().to_list(length=None)
    total_tokens = sum(
        10 + int(a["focus_score"] * 20) + int(a["engagement_score"] * 15) + 
        (5 if a["sentiment"] == "positive" else 0)
        for a in analyses
    )
    
    # Average scores
    avg_focus = sum(a["focus_score"] for a in analyses) / len(analyses) if analyses else 0
    avg_engagement = sum(a["engagement_score"] for a in analyses) / len(analyses) if analyses else 0
    
    return {
        "total_prayers": total_prayers,
        "total_tokens_earned": total_tokens,
        "average_focus_score": round(avg_focus, 2),
        "average_engagement_score": round(avg_engagement, 2)
    }