from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class User(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    tokens_balance: int = 50
    total_earned: int = 50
    total_donated: int = 0
    prayers_count: int = 0
    streak_days: int = 0

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str]
    tokens_balance: int
    total_earned: int
    total_donated: int
    prayers_count: int
    streak_days: int
    created_at: datetime