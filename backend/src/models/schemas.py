from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime

class TokenBalance(BaseModel):
    user_id: str
    total_earned: int = 0
    total_spent: int = 0
    current_balance: int = 0
    last_updated: datetime


class CharityDonation(BaseModel):
    id: str
    user_id: str
    charity_id: str
    tokens_spent: int
    created_at: datetime
    status: str = "completed"
    transaction_hash: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class TranscriptionRequest(BaseModel):
    language: Optional[str] = None
    
class TranscriptionResponse(BaseModel):
    id: str
    text: str
    language: Optional[str] = None
    duration: Optional[float] = None
    created_at: datetime
    
class AnalysisResponse(BaseModel):
    id: str
    transcription_id: str
    emotions: Dict[str, float]
    focus_score: float
    engagement_score: float
    key_phrases: List[str]
    created_at: datetime
    
    text_accuracy: Optional[float] = None
    emotional_stability: Optional[float] = None
    speech_fluency: Optional[float] = None
    is_focused: Optional[bool] = None

class AudioUploadResponse(BaseModel):
    message: str
    transcription: TranscriptionResponse
    analysis: Optional[AnalysisResponse] = None
