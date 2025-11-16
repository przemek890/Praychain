from pydantic import BaseModel
from datetime import datetime
from typing import Optional  # ✅ Dodaj

class DonationRequest(BaseModel):
    user_id: str
    charity_id: str
    tokens_amount: int

class CharityDonation(BaseModel):
    id: str
    user_id: str
    charity_id: str
    charity_title: str
    tokens_spent: int
    created_at: datetime
    status: str 

class DonationResponse(BaseModel):
    success: bool
    donation_id: str
    tokens_spent: int
    charity_title: str
    new_balance: int
    tx_hash: Optional[str] = None  # ✅ Dodaj
    message: str