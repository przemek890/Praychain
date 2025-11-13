from pydantic import BaseModel
from datetime import datetime

class TokenBalance(BaseModel):
    user_id: str
    total_earned: int = 0
    total_spent: int = 0
    current_balance: int = 0
    last_updated: datetime

class TokenTransaction(BaseModel):
    id: str
    user_id: str
    type: str  # "earn" or "spend"
    amount: int
    source: str  # "prayer:transcription_id" or "charity:charity_id"
    created_at: datetime
    description: str = ""