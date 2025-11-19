from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    wallet_address: Optional[str] = None  # ✅ NOWE - opcjonalny adres portfela

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    tokens_balance: int
    total_earned: int
    total_donated: int
    prayers_count: int
    streak_days: int
    level: int = 1
    experience: int = 0
    experience_to_next_level: int = 100
    wallet_address: Optional[str] = None  # ✅ NOWE

    class Config:
        from_attributes = True