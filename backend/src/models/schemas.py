from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime

class TokenBalance(BaseModel):
    user_id: str
    total_earned: int = 0
    total_spent: int = 0
    current_balance: int = 0
    last_updated: datetime

class CharityAction(BaseModel):
    id: str
    title: str
    description: str
    cost_tokens: int
    category: str  # "health", "education", "environment", "humanitarian"
    organization: str
    impact_description: str
    image_url: str
    is_active: bool = True
    total_supported: int = 0  # ile razy wsparto
    created_at: datetime

class CharityDonation(BaseModel):
    id: str
    user_id: str
    charity_id: str
    tokens_spent: int
    charity_title: str
    created_at: datetime
    status: str  # "pending", "completed", "failed"

class TranscriptionRequest(BaseModel):
    language: Optional[str] = None  # np. "pl", "en"
    
class TranscriptionResponse(BaseModel):
    id: str
    text: str
    language: Optional[str] = None
    duration: Optional[float] = None
    created_at: datetime
    
class AnalysisResponse(BaseModel):
    id: str
    transcription_id: str
    emotions: Dict[str, float]  # np. {"happy": 0.8, "sad": 0.2}
    focus_score: float  # 0-1
    engagement_score: float  # 0-1
    sentiment: str  # "positive", "negative", "neutral"
    key_phrases: List[str]
    created_at: datetime
    
    # Nowe pola
    text_accuracy: Optional[float] = None
    emotional_stability: Optional[float] = None
    speech_fluency: Optional[float] = None
    is_focused: Optional[bool] = None

class AudioUploadResponse(BaseModel):
    message: str
    transcription: TranscriptionResponse
    analysis: Optional[AnalysisResponse] = None
