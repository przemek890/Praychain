from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
import logging
from datetime import datetime
import uuid
from transformers import pipeline
import re
import os
from difflib import SequenceMatcher
import numpy as np

from src.config import settings
from src.utils.mongodb import get_database
from src.models.analysis import AnalysisResponse

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
logger = logging.getLogger(__name__)

_sentiment_analyzer = None
_emotion_analyzer = None
_models_loaded = False

os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "0"

def get_sentiment_analyzer():
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        logger.info("Loading sentiment model (distilbert-base)...")
        try:
            _sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=-1,
                framework="pt"
            )
            logger.info("Sentiment model loaded")
        except Exception as e:
            logger.error(f"Failed to load sentiment model: {e}")
            _sentiment_analyzer = None
    return _sentiment_analyzer

def get_emotion_analyzer():
    global _emotion_analyzer
    if _emotion_analyzer is None:
        logger.info("Loading emotion model (distilbert)...")
        try:
            _emotion_analyzer = pipeline(
                "text-classification",
                model="bhadresh-savani/distilbert-base-uncased-emotion",
                device=-1,
                framework="pt",
                top_k=None
            )
            logger.info("Emotion model loaded")
        except Exception as e:
            logger.error(f"Failed to load emotion model: {e}")
            _emotion_analyzer = None
    return _emotion_analyzer

def calculate_text_accuracy(transcribed_text: str, reference_text: str) -> float:
    if not reference_text or not transcribed_text:
        return 0.0
    
    trans_normalized = transcribed_text.lower().strip()
    ref_normalized = reference_text.lower().strip()
    
    similarity = SequenceMatcher(None, trans_normalized, ref_normalized).ratio()
    
    ref_words = set(ref_normalized.split())
    trans_words = set(trans_normalized.split())
    
    stopwords = {'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'}
    ref_keywords = ref_words - stopwords
    trans_keywords = trans_words - stopwords
    
    if ref_keywords:
        keyword_coverage = len(ref_keywords & trans_keywords) / len(ref_keywords)
    else:
        keyword_coverage = 1.0
    
    accuracy_score = (similarity * 0.7) + (keyword_coverage * 0.3)
    return round(accuracy_score, 2)

def analyze_emotional_stability(emotions: Dict[str, float]) -> Dict[str, float]:
    positive_emotions = ['joy', 'love']
    negative_emotions = ['anger', 'fear', 'sadness']
    
    positive_sum = sum(emotions.get(e, 0.0) for e in positive_emotions)
    negative_sum = sum(emotions.get(e, 0.0) for e in negative_emotions)
    total = positive_sum + negative_sum
    
    if total > 0:
        positive_ratio = positive_sum / total
    else:
        positive_ratio = 0.5
    
    emotion_values = list(emotions.values())
    if emotion_values:
        max_emotion = max(emotion_values)
        stability_score = 1.0 - (max_emotion * 0.5)
    else:
        stability_score = 0.5
    
    if emotions:
        dominant_emotion = max(emotions.items(), key=lambda x: x[1])[0]
    else:
        dominant_emotion = "neutral"
    
    return {
        "stability_score": max(0.0, min(1.0, stability_score)),
        "positive_ratio": max(0.0, min(1.0, positive_ratio)),
        "dominant_emotion": dominant_emotion
    }

def analyze_speech_fluency(text: str) -> float:
    if not text:
        return 0.0
    
    words = text.split()
    if len(words) == 0:
        return 0.0
    
    fillers = ['um', 'uh', 'er', 'hmm', 'like', 'you know', 'eee', 'yyy', 'mmm']
    filler_count = sum(text.lower().count(f) for f in fillers)
    
    filler_ratio = filler_count / len(words)
    fluency = max(0.0, 1.0 - (filler_ratio * 5))
    
    return round(fluency, 2)

def calculate_prayer_focus_score(
    text_accuracy: float,
    emotional_stability: float,
    speech_fluency: float
) -> float:
    focus = (text_accuracy * 0.4) + (emotional_stability * 0.4) + (speech_fluency * 0.2)
    return round(focus, 2)

def extract_key_phrases(text: str, max_phrases: int = 5) -> List[str]:
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s.split()) > 3]
    sentences.sort(key=lambda x: len(x.split()), reverse=True)
    return sentences[:max_phrases]

def initialize_models():
    global _sentiment_analyzer, _emotion_analyzer, _models_loaded
    try:
        logger.info("Initializing models...")
        _sentiment_analyzer = get_sentiment_analyzer()
        _emotion_analyzer = get_emotion_analyzer()
        
        if _sentiment_analyzer and _emotion_analyzer:
            logger.info("All models initialized successfully")
            _models_loaded = True
        else:
            logger.warning("Some models failed to load")
            _models_loaded = False
            
    except Exception as e:
        logger.error(f"Could not load models: {e}")
        _models_loaded = False

@router.post("/analyze/{transcription_id}/with-reference")
async def analyze_transcription_with_reference(
    transcription_id: str,
    reference_text: str,
    user_id: str = "default_user"
):
    try:
        db = get_database()
        transcription = await db.transcriptions.find_one({"_id": transcription_id})
        
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        
        transcribed_text = transcription.get("text", "")
        
        logger.info(f"Analyzing transcription {transcription_id} with reference")
        
        sentiment_result = get_sentiment_analyzer()(transcribed_text)[0]
        emotion_results = get_emotion_analyzer()(transcribed_text)
        
        emotions = {}
        for emotion in emotion_results[0]:
            emotions[emotion['label']] = round(emotion['score'], 2)
        
        logger.info(f"Emotions detected: {emotions}")
        
        text_accuracy = calculate_text_accuracy(transcribed_text, reference_text)
        emotional_stability_dict = analyze_emotional_stability(emotions)
        speech_fluency = analyze_speech_fluency(transcribed_text)
        
        logger.info(f"Text accuracy: {text_accuracy:.2f}")
        
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
            "sentiment": sentiment_result['label'].lower(),
            "sentiment_score": round(sentiment_result['score'], 2),
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing transcription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during analysis: {str(e)}")

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
        key_phrases=analysis["key_phrases"],
        created_at=analysis["created_at"]
    )

@router.get("/")
async def list_analyses(skip: int = 0, limit: int = 10):
    db = get_database()
    analyses = await db.analyses.find().skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "total": await db.analyses.count_documents({}),
        "analyses": [
            AnalysisResponse(
                id=a["_id"],
                transcription_id=a["transcription_id"],
                emotions=a["emotions"],
                focus_score=a["focus_score"],
                engagement_score=a["engagement_score"],
                sentiment=a["sentiment"],
                key_phrases=a["key_phrases"],
                created_at=a["created_at"]
            )
            for a in analyses
        ]
    }

def interpret_prayer_sentiment(sentiment: str, emotions: Dict[str, float]) -> dict:
    negative_emotions = ["anger", "disgust", "annoyance"]
    peaceful_emotions = ["neutral", "joy", "admiration"]
    penitent_emotions = ["sadness", "fear", "disappointment"]
    
    max_negative = max([emotions.get(e, 0) for e in negative_emotions])
    max_peaceful = max([emotions.get(e, 0) for e in peaceful_emotions])
    max_penitent = max([emotions.get(e, 0) for e in penitent_emotions])
    
    if max_peaceful > 0.5:
        mood = "peaceful"
    elif max_penitent > 0.5:
        mood = "penitent"
    elif sentiment == "positive":
        mood = "joyful"
    else:
        mood = "contemplative"
    
    is_appropriate = max_negative < 0.6
    
    return {
        "mood": mood,
        "is_appropriate": is_appropriate,
        "interpretation": get_mood_description(mood)
    }

def get_mood_description(mood: str) -> str:
    descriptions = {
        "peaceful": "Calm, focused prayer with inner peace",
        "penitent": "Sincere, repentant prayer seeking forgiveness",
        "joyful": "Joyful, grateful prayer full of thanksgiving",
        "contemplative": "Reflective, thoughtful meditation on Scripture"
    }
    return descriptions.get(mood, "Prayer with authentic emotions")
