from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DonationRequest(BaseModel):
    user_id: str
    charity_id: str
    tokens_amount: int

class DonationResponse(BaseModel):
    donation_id: str
    success: bool
    message: str
    tokens_spent: int
    charity_title: str
    new_balance: int
    transaction_hash: Optional[str] = None