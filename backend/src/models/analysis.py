from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

class AnalysisMetrics(BaseModel):
    focus_score: float
    engagement_score: float
    sentiment: str
    text_accuracy: float
    emotional_stability: float
    speech_fluency: float

class TokenBreakdown(BaseModel):
    accuracy_points: int
    stability_points: int
    fluency_points: int
    focus_points: int

class AnalysisResponse(BaseModel):
    transcription_id: str
    analysis: AnalysisMetrics
    tokens_earned: int
    breakdown: TokenBreakdown
    created_at: datetime