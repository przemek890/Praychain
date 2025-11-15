from fastapi import APIRouter, HTTPException
from typing import Dict
import logging
from datetime import datetime
import uuid
import os
from difflib import SequenceMatcher
import requests
import time

from src.config import settings
from src.utils.mongodb import get_database
from src.models.analysis import AnalysisResponse

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
logger = logging.getLogger(__name__)

# HuggingFace Inference API - NOWY ENDPOINT
HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_API_BASE = "https://router.huggingface.co/hf-inference"

def analyze_sentiment_api(text: str) -> Dict:
    """Sentiment analysis - cardiffnlp/twitter-roberta-base-sentiment-latest"""
    if not HF_API_KEY:
        raise HTTPException(status_code=500, detail="HF_API_KEY not configured")
    
    try:
        headers = {"Authorization": f"Bearer {HF_API_KEY}"}
        
        # NOWY ENDPOINT
        response = requests.post(
            f"{HF_API_BASE}/models/cardiffnlp/twitter-roberta-base-sentiment-latest",
            headers=headers,
            json={"inputs": text},
            timeout=30
        )
        
        if response.status_code == 503:
            logger.warning("Model loading, waiting 20s...")
            time.sleep(20)
            response = requests.post(
                f"{HF_API_BASE}/models/cardiffnlp/twitter-roberta-base-sentiment-latest",
                headers=headers,
                json={"inputs": text},
                timeout=30
            )
        
        if response.status_code != 200:
            logger.error(f"Sentiment API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"HF API failed: {response.text}")
        
        result = response.json()
        
        # Format: [[{"label": "positive", "score": 0.95}]]
        if isinstance(result, list) and len(result) > 0:
            scores = result[0] if isinstance(result[0], list) else result
            top_sentiment = max(scores, key=lambda x: x['score'])
            return {
                "label": top_sentiment["label"],
                "score": round(top_sentiment["score"], 2)
            }
        
        raise HTTPException(status_code=500, detail="Unexpected API response format")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sentiment API failed: {e}")
        raise HTTPException(status_code=503, detail=str(e))

def analyze_emotion_api(text: str) -> Dict[str, float]:
    """Emotion analysis - j-hartmann/emotion-english-distilroberta-base"""
    if not HF_API_KEY:
        raise HTTPException(status_code=500, detail="HF_API_KEY not configured")
    
    try:
        headers = {"Authorization": f"Bearer {HF_API_KEY}"}
        
        # NOWY ENDPOINT - Model z 7 emocjami
        response = requests.post(
            f"{HF_API_BASE}/models/j-hartmann/emotion-english-distilroberta-base",
            headers=headers,
            json={"inputs": text},
            timeout=30
        )
        
        if response.status_code == 503:
            logger.warning("Model loading, waiting 20s...")
            time.sleep(20)
            response = requests.post(
                f"{HF_API_BASE}/models/j-hartmann/emotion-english-distilroberta-base",
                headers=headers,
                json={"inputs": text},
                timeout=30
            )
        
        if response.status_code != 200:
            logger.error(f"Emotion API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"HF API failed: {response.text}")
        
        results = response.json()
        emotions = {}
        
        # Format: [[{"label": "joy", "score": 0.85}, ...]]
        if isinstance(results, list) and len(results) > 0:
            emotion_list = results[0] if isinstance(results[0], list) else results
            for emotion in emotion_list:
                emotions[emotion['label']] = round(emotion['score'], 2)
        
        if not emotions:
            raise HTTPException(status_code=500, detail="No emotions detected")
        
        return emotions
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Emotion API failed: {e}")
        raise HTTPException(status_code=503, detail=str(e))

def calculate_text_accuracy(transcribed_text: str, reference_text: str) -> float:
    """Compare transcribed text with reference"""
    if not reference_text or not transcribed_text:
        return 0.0
    
    trans_normalized = transcribed_text.lower().strip()
    ref_normalized = reference_text.lower().strip()
    
    # Character-level similarity
    similarity = SequenceMatcher(None, trans_normalized, ref_normalized).ratio()
    
    # Keyword coverage
    ref_words = set(ref_normalized.split())
    trans_words = set(trans_normalized.split())
    
    stopwords = {'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'}
    ref_keywords = ref_words - stopwords
    trans_keywords = trans_words - stopwords
    
    if ref_keywords:
        keyword_coverage = len(ref_keywords & trans_keywords) / len(ref_keywords)
    else:
        keyword_coverage = 1.0
    
    # Weighted score
    accuracy_score = (similarity * 0.7) + (keyword_coverage * 0.3)
    return round(accuracy_score, 2)

def analyze_emotional_stability(emotions: Dict[str, float]) -> Dict[str, float]:
    """Calculate emotional stability from emotion scores"""
    positive_emotions = ['joy', 'neutral']
    negative_emotions = ['anger', 'fear', 'sadness', 'disgust']
    
    positive_sum = sum(emotions.get(e, 0.0) for e in positive_emotions)
    negative_sum = sum(emotions.get(e, 0.0) for e in negative_emotions)
    total = positive_sum + negative_sum
    
    positive_ratio = positive_sum / total if total > 0 else 0.5
    
    # Stability = inverse of emotional extremeness
    emotion_values = list(emotions.values())
    if emotion_values:
        max_emotion = max(emotion_values)
        stability_score = 1.0 - (max_emotion * 0.5)
    else:
        stability_score = 0.5
    
    dominant_emotion = max(emotions.items(), key=lambda x: x[1])[0] if emotions else "neutral"
    
    return {
        "stability_score": max(0.0, min(1.0, stability_score)),
        "positive_ratio": max(0.0, min(1.0, positive_ratio)),
        "dominant_emotion": dominant_emotion
    }

def analyze_speech_fluency(text: str) -> float:
    """
    Detect speech disfluencies (um, uh, er...)
    Higher score = more fluent speech
    """
    if not text:
        return 0.0
    
    words = text.split()
    if len(words) == 0:
        return 0.0
    
    # Common filler words
    fillers = ['um', 'uh', 'er', 'hmm', 'like', 'you know', 'eee', 'yyy', 'mmm', 'ah']
    filler_count = sum(text.lower().count(f' {filler} ') for filler in fillers)
    
    # Penalize filler ratio
    filler_ratio = filler_count / len(words)
    fluency = max(0.0, 1.0 - (filler_ratio * 5))
    
    return round(fluency, 2)

def calculate_prayer_focus_score(
    text_accuracy: float,
    emotional_stability: float,
    speech_fluency: float
) -> float:
    """
    Overall focus score combining:
    - 40% text accuracy (did they say the right words?)
    - 40% emotional stability (calm, focused prayer)
    - 20% speech fluency (no hesitation)
    """
    focus = (text_accuracy * 0.4) + (emotional_stability * 0.4) + (speech_fluency * 0.2)
    return round(focus, 2)

@router.post("/analyze/{transcription_id}/with-reference")
async def analyze_transcription_with_reference(
    transcription_id: str,
    reference_text: str,
    user_id: str = "default_user"
):
    """
    Analyze prayer transcription using HuggingFace API
    NOWY ENDPOINT: router.huggingface.co
    """
    db = get_database()
    transcription = await db.transcriptions.find_one({"_id": transcription_id})
    
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    transcribed_text = transcription.get("text", "")
    
    logger.info(f"Analyzing transcription {transcription_id} via HuggingFace API (new endpoint)")
    
    # Call HuggingFace API - NOWY ENDPOINT
    sentiment_result = analyze_sentiment_api(transcribed_text)
    emotions = analyze_emotion_api(transcribed_text)
    
    logger.info(f"API results - Sentiment: {sentiment_result['label']}, Emotions: {emotions}")
    
    # Local calculations
    text_accuracy = calculate_text_accuracy(transcribed_text, reference_text)
    emotional_stability_dict = analyze_emotional_stability(emotions)
    speech_fluency = analyze_speech_fluency(transcribed_text)
    
    focus_score = calculate_prayer_focus_score(
        text_accuracy,
        emotional_stability_dict["stability_score"],
        speech_fluency
    )
    
    engagement_score = (emotional_stability_dict["positive_ratio"] + speech_fluency) / 2
    
    result = {
        "id": str(uuid.uuid4()),
        "transcription_id": transcription_id,
        "user_id": user_id,
        "focus_score": round(focus_score, 2),
        "engagement_score": round(engagement_score, 2),
        "sentiment": sentiment_result['label'],
        "sentiment_score": sentiment_result['score'],
        "emotions": emotions,
        "text_accuracy": round(text_accuracy, 2),
        "emotional_stability": round(emotional_stability_dict["stability_score"], 2),
        "speech_fluency": round(speech_fluency, 2),
        "is_focused": focus_score > 0.6,
        "created_at": datetime.utcnow()
    }
    
    await db.analyses.insert_one(result)
    logger.info(f"Analysis saved: accuracy={text_accuracy:.2f}, focus={focus_score:.2f}")
    
    return result

@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: str):
    db = get_database()
    analysis = await db.analyses.find_one({"_id": analysis_id})
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return AnalysisResponse(
        id=analysis["_id"],
        transcription_id=analysis["transcription_id"],
        emotions=analysis["emotions"],
        focus_score=analysis["focus_score"],
        engagement_score=analysis["engagement_score"],
        sentiment=analysis["sentiment"],
        key_phrases=analysis.get("key_phrases", []),
        created_at=analysis["created_at"]
    )

@router.get("/")
async def list_analyses(skip: int = 0, limit: int = 10):
    db = get_database()
    analyses = await db.analyses.find().skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "total": await db.analyses.count_documents({}),
        "analyses": analyses
    }
