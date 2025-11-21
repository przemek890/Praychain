import os
import logging
from fastapi import APIRouter, HTTPException
from typing import Dict
from datetime import datetime
from difflib import SequenceMatcher
import httpx

from src.config import settings
from src.utils.mongodb import get_database
from src.models.analysis import AnalysisResponse, AnalysisMetrics, TokenBreakdown

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
logger = logging.getLogger(__name__)

async def call_hf_emotion_api(text: str) -> Dict:
    """Call Hugging Face Emotion API"""
    url = f"{settings.HF_API_BASE}/{settings.HF_EMOTION_MODEL}"
    headers = {"Authorization": f"Bearer {settings.HF_API_KEY}"}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, headers=headers, json={"inputs": text})
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"HF API error: {e}")
            return None

def analyze_emotion_api(text: str) -> Dict[str, float]:
    """Emotion analysis - j-hartmann/emotion-english-distilroberta-base"""
    if not settings.HF_API_KEY:
        logger.warning("HF_API_KEY not set, using mock emotions")
        return {"joy": 0.7, "sadness": 0.1, "anger": 0.05, "fear": 0.05, "disgust": 0.05, "surprise": 0.05}
    
    result = call_hf_emotion_api(text)
    
    if result is not None and isinstance(result, list) and len(result) > 0:
        emotions = {item["label"]: item["score"] for item in result[0]}
        return emotions
    
    logger.warning(f"HF Emotion API error")
    return {"joy": 0.5, "sadness": 0.1, "anger": 0.1, "fear": 0.1, "disgust": 0.1, "surprise": 0.1}
            

def calculate_text_accuracy(transcribed_text: str, reference_text: str) -> float:
    """Compare transcribed text with reference"""
    if not reference_text or not transcribed_text:
        return 0.0
    
    trans_normalized = transcribed_text.lower().strip()
    ref_normalized = reference_text.lower().strip()
    
    similarity = SequenceMatcher(None, trans_normalized, ref_normalized).ratio()
    
    ref_words = set(ref_normalized.split())
    trans_words = set(trans_normalized.split())
    
    stopwords = {'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'}
    ref_keywords = ref_words - stopwords
    trans_keywords = trans_words - stopwords
    
    if ref_keywords:
        keyword_coverage = len(ref_keywords & trans_keywords) / len(ref_keywords)
    else:
        keyword_coverage = 1.0
    
    accuracy_score = (similarity * 0.7) + (keyword_coverage * 0.3)
    return round(accuracy_score, 2)

def analyze_emotional_stability(emotions: Dict[str, float]) -> float:
    """Stabilność emocjonalna - preferencja dla spokojnych emocji"""
    calm_emotions = emotions.get("joy", 0) * 0.8
    volatile_emotions = emotions.get("anger", 0) + emotions.get("fear", 0) + emotions.get("disgust", 0)
    stability = max(0.0, min(1.0, calm_emotions - volatile_emotions + 0.5))
    return round(stability, 2)

def analyze_speech_fluency(text: str) -> float:
    """Płynność mowy - brak zacinania się, powtórzeń"""
    words = text.split()
    if len(words) < 3:
        return 0.5
    
    unique_words = set(words)
    repetition_ratio = len(unique_words) / len(words)
    
    filler_words = sum(1 for w in words if len(w) <= 2)
    filler_penalty = filler_words / len(words)
    
    fluency = (repetition_ratio * 0.7) + ((1 - filler_penalty) * 0.3)
    return round(max(0.0, min(1.0, fluency)), 2)

def calculate_prayer_focus_score(
    text_accuracy: float,
    emotional_stability: float,
    speech_fluency: float
) -> float:
    """Ogólny wynik skupienia podczas modlitwy"""
    focus = (text_accuracy * 0.5) + (emotional_stability * 0.3) + (speech_fluency * 0.2)
    return round(focus, 2)

@router.post("/analyze/{transcription_id}/with-reference")
async def analyze_with_reference(transcription_id: str, reference_text: str):
    db = get_database()
    transcription = await db.transcriptions.find_one({"_id": transcription_id})
    
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    transcribed_text = transcription["text"]
    
    emotions = analyze_emotion_api(transcribed_text)
    
    text_accuracy = calculate_text_accuracy(transcribed_text, reference_text)
    emotional_stability = analyze_emotional_stability(emotions)
    speech_fluency = analyze_speech_fluency(transcribed_text)
    focus_score = calculate_prayer_focus_score(text_accuracy, emotional_stability, speech_fluency)
    
    engagement_score = round((emotions.get("joy", 0) + text_accuracy) / 2, 2)
    
    accuracy_points = int(text_accuracy * settings.ACCURACY_POINTS_MULTIPLIER)
    stability_points = int(emotional_stability * settings.STABILITY_POINTS_MULTIPLIER)
    fluency_points = int(speech_fluency * settings.FLUENCY_POINTS_MULTIPLIER)
    focus_points = int(focus_score * settings.FOCUS_POINTS_MULTIPLIER)
    
    tokens_earned = accuracy_points + stability_points + fluency_points + focus_points
    
    analysis_data = {
        "_id": f"analysis_{transcription_id}",
        "transcription_id": transcription_id,
        "emotions": emotions,
        "focus_score": focus_score,
        "engagement_score": engagement_score,
        "text_accuracy": text_accuracy,
        "emotional_stability": emotional_stability,
        "speech_fluency": speech_fluency,
        "tokens_earned": tokens_earned,
        "breakdown": {
            "accuracy_points": accuracy_points,
            "stability_points": stability_points,
            "fluency_points": fluency_points,
            "focus_points": focus_points
        },
        "created_at": datetime.utcnow()
    }
    
    await db.analyses.insert_one(analysis_data)
    
    return AnalysisResponse(
        transcription_id=transcription_id,
        analysis=AnalysisMetrics(
            focus_score=focus_score,
            engagement_score=engagement_score,
            text_accuracy=text_accuracy,
            emotional_stability=emotional_stability,
            speech_fluency=speech_fluency
        ),
        tokens_earned=tokens_earned,
        breakdown=TokenBreakdown(
            accuracy_points=accuracy_points,
            stability_points=stability_points,
            fluency_points=fluency_points,
            focus_points=focus_points
        ),
        created_at=analysis_data["created_at"]
    )

@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: str):
    db = get_database()
    analysis = await db.analyses.find_one({"_id": analysis_id})
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return AnalysisResponse(
        transcription_id=analysis["transcription_id"],
        analysis=AnalysisMetrics(**analysis),
        tokens_earned=analysis["tokens_earned"],
        breakdown=TokenBreakdown(**analysis["breakdown"]),
        created_at=analysis["created_at"]
    )
