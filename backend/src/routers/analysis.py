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
from src.models.analysis import AnalysisResponse  # ✅ Zmieniony import

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
logger = logging.getLogger(__name__)

_sentiment_analyzer = None
_emotion_analyzer = None

# Disable torch security warnings
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "0"

def get_sentiment_analyzer():
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        logger.info("Loading sentiment analysis model...")
        try:
            _sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
                device=-1
                # Usuń use_safetensors - ten model nie ma safetensors
            )
        except Exception as e:
            logger.warning(f"Failed to load primary sentiment model: {e}")
            # Fallback to simpler model with safetensors support
            _sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=-1
            )
    return _sentiment_analyzer

def get_emotion_analyzer():
    global _emotion_analyzer
    if _emotion_analyzer is None:
        logger.info("Loading emotion analysis model...")
        try:
            _emotion_analyzer = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                top_k=None,
                device=-1
                # Usuń use_safetensors - sprawdź czy ten model go ma
            )
        except Exception as e:
            logger.warning(f"Failed to load emotion model: {e}")
            # Fallback to sentiment as emotion
            _emotion_analyzer = get_sentiment_analyzer()
    return _emotion_analyzer

def calculate_focus_score(text: str) -> float:
    """Calculate focus score based on text structure and coherence"""
    if not text:
        return 0.0
    
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if len(sentences) == 0:
        return 0.0
    
    # Average sentence length
    avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)
    length_score = min(1.0, avg_sentence_length / 20.0) if avg_sentence_length < 20 else max(0.5, 1.0 - (avg_sentence_length - 20) / 30.0)
    
    # Filler words detection
    filler_words = ['um', 'uh', 'like', 'you know', 'hmm', 'eee', 'yyy']
    text_lower = text.lower()
    filler_count = sum(text_lower.count(word) for word in filler_words)
    coherence_score = max(0.0, 1.0 - (filler_count / len(text.split())) * 10)
    
    # Structure score
    structure_score = min(1.0, len(sentences) / 10.0)
    
    focus_score = (length_score * 0.3 + coherence_score * 0.5 + structure_score * 0.2)
    return round(focus_score, 2)

def calculate_engagement_score(emotions: Dict[str, float], sentiment: str) -> float:
    """Calculate engagement score based on emotional intensity"""
    emotion_values = list(emotions.values())
    if not emotion_values:
        return 0.5
    
    max_emotion = max(emotion_values)
    sentiment_bonus = 0.1 if sentiment == "positive" else 0.0
    engagement = min(1.0, max_emotion + sentiment_bonus)
    
    return round(engagement, 2)

def extract_key_phrases(text: str, max_phrases: int = 5) -> List[str]:
    """Extract key phrases from text"""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s.split()) > 3]
    sentences.sort(key=lambda x: len(x.split()), reverse=True)
    return sentences[:max_phrases]

def calculate_text_accuracy(transcribed_text: str, reference_text: str) -> float:
    """
    Porównuje transkrypcję z tekstem referencyjnym (biblijnym)
    Zwraca score 0.0-1.0 bazując na podobieństwie
    """
    if not reference_text or not transcribed_text:
        return 0.0
    
    # Normalizacja tekstów
    trans_normalized = transcribed_text.lower().strip()
    ref_normalized = reference_text.lower().strip()
    
    # Similarity ratio
    similarity = SequenceMatcher(None, trans_normalized, ref_normalized).ratio()
    
    # Sprawdź czy wszystkie kluczowe słowa z referencji są w transkrypcji
    ref_words = set(ref_normalized.split())
    trans_words = set(trans_normalized.split())
    
    # Usuń stopwords
    stopwords = {'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'}
    ref_keywords = ref_words - stopwords
    trans_keywords = trans_words - stopwords
    
    if ref_keywords:
        keyword_coverage = len(ref_keywords & trans_keywords) / len(ref_keywords)
    else:
        keyword_coverage = 1.0
    
    # Weighted score
    accuracy_score = (similarity * 0.7) + (keyword_coverage * 0.3)
    
    return round(accuracy_score, 2)

def analyze_emotional_stability(emotions: Dict[str, float]) -> dict:
    """
    Analizuje emocje pod kątem stabilności i skupienia na modlitwie
    
    Pożądane emocje: joy, neutral, contentment
    Niepożądane: anger, fear, sadness, disgust
    """
    # Pożądane emocje przy modlitwie
    positive_emotions = ["joy", "neutral", "admiration", "optimism", "gratitude", "love"]
    negative_emotions = ["anger", "fear", "sadness", "disgust", "annoyance", "disappointment"]
    
    positive_score = sum(emotions.get(e, 0) for e in positive_emotions)
    negative_score = sum(emotions.get(e, 0) for e in negative_emotions)
    
    # Im więcej pozytywnych i mniej negatywnych, tym lepiej
    if positive_score + negative_score > 0:
        stability = positive_score / (positive_score + negative_score)
    else:
        stability = 0.5
    
    # Sprawdź czy nie ma nadmiernej dominacji jednej negatywnej emocji
    max_negative = max([emotions.get(e, 0) for e in negative_emotions]) if negative_emotions else 0
    
    if max_negative > 0.5:  # Silna negatywna emocja
        stability *= 0.5
    
    return {
        "stability_score": round(stability, 2),
        "positive_emotions": round(positive_score, 2),
        "negative_emotions": round(negative_score, 2),
        "is_focused": stability > 0.6 and max_negative < 0.4
    }

def calculate_prayer_focus_score(
    text_accuracy: float,
    emotional_stability: float,
    speech_fluency: float
) -> float:
    """
    Nowy focus score bazujący na:
    - Poprawności czytania (40%)
    - Stabilności emocjonalnej (40%)
    - Płynności mowy (20%)
    """
    focus = (text_accuracy * 0.4) + (emotional_stability * 0.4) + (speech_fluency * 0.2)
    return round(focus, 2)

def analyze_speech_fluency(text: str) -> float:
    """
    Analizuje płynność mowy - mniej przerw i filler words = lepszy score
    """
    if not text:
        return 0.0
    
    words = text.split()
    if len(words) == 0:
        return 0.0
    
    # Filler words i pauzy
    fillers = ['um', 'uh', 'er', 'hmm', 'like', 'you know', 'eee', 'yyy', 'mmm']
    filler_count = sum(text.lower().count(f) for f in fillers)
    
    # Im mniej fillers, tym lepiej
    filler_ratio = filler_count / len(words)
    fluency = max(0.0, 1.0 - (filler_ratio * 5))  # Każdy filler obniża o 5%
    
    return round(fluency, 2)

def initialize_models():
    """
    Pre-load AI models during startup to avoid slow first request
    """
    global _sentiment_analyzer, _emotion_analyzer
    logger.info("Initializing sentiment analyzer...")
    _sentiment_analyzer = get_sentiment_analyzer()
    logger.info("Initializing emotion analyzer...")
    _emotion_analyzer = get_emotion_analyzer()
    logger.info("All AI models initialized successfully")

@router.post("/{transcription_id}", response_model=AnalysisResponse)
async def analyze_transcription(
    transcription_id: str,
    reference_text: Optional[str] = None  # Tekst biblijny do porównania
):
    """
    Ulepszona analiza skupiona na:
    1. Porównaniu transkrypcji z tekstem biblijnym
    2. Analizie stabilności emocjonalnej
    3. Płynności mowy
    """
    db = get_database()
    transcription = await db.transcriptions.find_one({"_id": transcription_id})
    
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    text = transcription["text"]
    
    try:
        logger.info(f"Analyzing transcription {transcription_id}")
        
        # 1. Analiza emocji
        emotion_analyzer = get_emotion_analyzer()
        emotion_results = emotion_analyzer(text[:512])
        
        if isinstance(emotion_results[0], list):
            emotions = {result["label"]: round(result["score"], 2) for result in emotion_results[0]}
        else:
            emotions = {emotion_results[0]["label"]: round(emotion_results[0]["score"], 2)}
        
        # 2. Analiza stabilności emocjonalnej
        emotional_analysis = analyze_emotional_stability(emotions)
        
        # 3. Analiza poprawności czytania (jeśli jest tekst referencyjny)
        text_accuracy = 1.0  # Default jeśli brak referencji
        if reference_text:
            text_accuracy = calculate_text_accuracy(text, reference_text)
        
        # 4. Analiza płynności mowy
        speech_fluency = analyze_speech_fluency(text)
        
        # 5. Nowy focus score
        focus_score = calculate_prayer_focus_score(
            text_accuracy,
            emotional_analysis["stability_score"],
            speech_fluency
        )
        
        # 6. Engagement score (jak bardzo zaangażowany)
        sentiment_analyzer = get_sentiment_analyzer()
        sentiment_result = sentiment_analyzer(text[:512])[0]
        sentiment_map = {
            "positive": "positive", "negative": "negative", "neutral": "neutral",
            "Positive": "positive", "Negative": "negative", "Neutral": "neutral",
            "POSITIVE": "positive", "NEGATIVE": "negative", "NEUTRAL": "neutral"
        }
        sentiment = sentiment_map.get(sentiment_result["label"], "neutral")
        
        engagement_score = emotional_analysis["positive_emotions"]
        
        # 7. Key phrases
        key_phrases = extract_key_phrases(text)
        
        # 8. Zapisz do bazy
        analysis_id = str(uuid.uuid4())
        analysis_data = {
            "_id": analysis_id,
            "transcription_id": transcription_id,
            "emotions": emotions,
            "focus_score": focus_score,
            "engagement_score": engagement_score,
            "sentiment": sentiment,
            "key_phrases": key_phrases,
            "created_at": datetime.utcnow(),
            # Dodatkowe metryki
            "text_accuracy": text_accuracy,
            "emotional_stability": emotional_analysis["stability_score"],
            "speech_fluency": speech_fluency,
            "is_focused": emotional_analysis["is_focused"],
            "positive_emotions": emotional_analysis["positive_emotions"],
            "negative_emotions": emotional_analysis["negative_emotions"]
        }
        
        await db.analyses.insert_one(analysis_data)
        logger.info(f"Analysis saved with ID: {analysis_id}")
        
        return AnalysisResponse(
            id=analysis_id,
            transcription_id=transcription_id,
            emotions=emotions,
            focus_score=focus_score,
            engagement_score=engagement_score,
            sentiment=sentiment,
            key_phrases=key_phrases,
            created_at=analysis_data["created_at"]
        )
        
    except Exception as e:
        logger.error(f"Error analyzing transcription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during analysis: {str(e)}")

@router.post("/{transcription_id}/reference", response_model=AnalysisResponse)
async def analyze_transcription_with_reference(
    transcription_id: str,
    reference_text: Optional[str] = None,
    user_id: Optional[str] = None
) -> AnalysisResponse:
    """
    NOWA funkcja - analizuje transkrypcję z tekstem referencyjnym
    """
    db = get_database()
    transcription = await db.transcriptions.find_one({"_id": transcription_id})
    
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    text = transcription["text"]
    
    try:
        logger.info(f"Analyzing transcription {transcription_id} with reference")
        
        # 1. Analiza emocji
        emotion_analyzer = get_emotion_analyzer()
        emotion_results = emotion_analyzer(text[:512])
        
        if isinstance(emotion_results[0], list):
            emotions = {result["label"]: round(result["score"], 2) for result in emotion_results[0]}
        else:
            emotions = {emotion_results[0]["label"]: round(emotion_results[0]["score"], 2)}
        
        # 2. Stabilność emocjonalna
        emotional_analysis = analyze_emotional_stability(emotions)
        
        # 3. ✅ POPRAWKA: Użyj przekazanego reference_text
        text_accuracy = 1.0
        if reference_text:
            text_accuracy = calculate_text_accuracy(text, reference_text)
            logger.info(f"Text accuracy: {text_accuracy} (compared to reference)")
        
        # 4. Płynność mowy
        speech_fluency = analyze_speech_fluency(text)
        
        # 5. Focus score
        focus_score = calculate_prayer_focus_score(
            text_accuracy,
            emotional_analysis["stability_score"],
            speech_fluency
        )
        
        # 6. Sentiment i engagement
        sentiment_analyzer = get_sentiment_analyzer()
        sentiment_result = sentiment_analyzer(text[:512])[0]
        sentiment_map = {
            "positive": "positive", "negative": "negative", "neutral": "neutral",
            "Positive": "positive", "Negative": "negative", "Neutral": "neutral",
            "POSITIVE": "positive", "NEGATIVE": "negative", "NEUTRAL": "neutral"
        }
        sentiment = sentiment_map.get(sentiment_result["label"], "neutral")
        
        # ✅ NOWA INTERPRETACJA
        prayer_mood = interpret_prayer_sentiment(sentiment, emotions)
        
        engagement_score = emotional_analysis["positive_emotions"]
        
        # 7. Key phrases
        key_phrases = extract_key_phrases(text)
        
        # 8. ✅ Zapisz z user_id
        analysis_id = str(uuid.uuid4())
        analysis_data = {
            "_id": analysis_id,
            "transcription_id": transcription_id,
            "user_id": user_id,  # ✅ Dodaj user_id
            "emotions": emotions,
            "focus_score": focus_score,
            "engagement_score": engagement_score,
            "sentiment": sentiment,
            "prayer_mood": prayer_mood["mood"],  # ✅ Nowe pole
            "mood_interpretation": prayer_mood["interpretation"],  # ✅ Opis
            "is_appropriate_mood": prayer_mood["is_appropriate"],  # ✅ Czy OK
            "key_phrases": key_phrases,
            "created_at": datetime.utcnow(),
            "text_accuracy": text_accuracy,
            "emotional_stability": emotional_analysis["stability_score"],
            "speech_fluency": speech_fluency,
            "is_focused": emotional_analysis["is_focused"],
            "positive_emotions": emotional_analysis["positive_emotions"],
            "negative_emotions": emotional_analysis["negative_emotions"],
            "reference_provided": reference_text is not None  # ✅ Czy był tekst referencyjny
        }
        
        await db.analyses.insert_one(analysis_data)
        logger.info(f"Analysis saved: accuracy={text_accuracy}, focus={focus_score}")
        
        return AnalysisResponse(
            id=analysis_id,
            transcription_id=transcription_id,
            emotions=emotions,
            focus_score=focus_score,
            engagement_score=engagement_score,
            sentiment=sentiment,
            key_phrases=key_phrases,
            created_at=analysis_data["created_at"],
            text_accuracy=text_accuracy,
            emotional_stability=emotional_analysis["stability_score"],
            speech_fluency=speech_fluency,
            is_focused=emotional_analysis["is_focused"]
        )
        
    except Exception as e:
        logger.error(f"Error analyzing transcription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during analysis: {str(e)}")

@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: str):
    """Get analysis by ID"""
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
    """List all analyses with pagination"""
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
    """
    Interpretuje sentiment w kontekście modlitwy - NIE jako ocenę jakości!
    
    Returns:
        - mood: "joyful", "contemplative", "penitent", "peaceful"
        - is_appropriate: bool (czy emocje pasują do modlitwy)
    """
    # W modlitwie zarówno pozytywne jak i negatywne emocje są OK
    # Ważne to stabilność i szczerość
    
    negative_emotions = ["anger", "disgust", "annoyance"]
    peaceful_emotions = ["neutral", "joy", "admiration"]
    penitent_emotions = ["sadness", "fear", "disappointment"]
    
    max_negative = max([emotions.get(e, 0) for e in negative_emotions])
    max_peaceful = max([emotions.get(e, 0) for e in peaceful_emotions])
    max_penitent = max([emotions.get(e, 0) for e in penitent_emotions])
    
    # Interpretacja nastroju modlitwy
    if max_peaceful > 0.5:
        mood = "peaceful"  # Spokojna modlitwa
    elif max_penitent > 0.5:
        mood = "penitent"  # Pokutna modlitwa
    elif sentiment == "positive":
        mood = "joyful"    # Radosna modlitwa
    else:
        mood = "contemplative"  # Rozważająca
    
    # Sprawdź czy NIE ma destrukcyjnych emocji (gniew, wściekłość)
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
