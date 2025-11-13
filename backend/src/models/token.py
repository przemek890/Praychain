from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TokenBalance(BaseModel):
    user_id: str
    total_earned: int
    total_spent: int
    current_balance: int
    last_updated: datetime

class TokenTransaction(BaseModel):
    id: str
    user_id: str
    type: str
    amount: int
    source: str
    created_at: datetime
    description: str = ""

class AddTokensRequest(BaseModel):
    user_id: str
    amount: int
    source: str = "admin:manual"
    description: str = ""

class AwardTokensRequest(BaseModel):
    user_id: str
    transcription_id: str
    text_accuracy: float
    emotional_stability: float
    speech_fluency: float
    captcha_accuracy: float
    focus_score: float