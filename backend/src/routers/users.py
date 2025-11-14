from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
import logging

from src.utils.mongodb import get_database
from src.models.user import User, UserCreate, UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])
logger = logging.getLogger(__name__)

@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate):
    db = get_database()
    
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_data = {
        "_id": user.username,
        "username": user.username,
        "email": user.email,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True,
        "tokens_balance": 50,
        "total_earned": 50,
        "total_donated": 0,
        "prayers_count": 0,
        "streak_days": 0
    }
    
    await db.users.insert_one(user_data)
    
    return UserResponse(
        id=user_data["_id"],
        username=user_data["username"],
        email=user_data["email"],
        tokens_balance=user_data["tokens_balance"],
        total_earned=user_data["total_earned"],
        total_donated=user_data["total_donated"],
        prayers_count=user_data["prayers_count"],
        streak_days=user_data["streak_days"],
        created_at=user_data["created_at"]
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    db = get_database()
    user = await db.users.find_one({"_id": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user["_id"],
        username=user["username"],
        email=user.get("email"),
        tokens_balance=user.get("tokens_balance", 0),
        total_earned=user.get("total_earned", 0),
        total_donated=user.get("total_donated", 0),
        prayers_count=user.get("prayers_count", 0),
        streak_days=user.get("streak_days", 0),
        created_at=user["created_at"]
    )

@router.get("/")
async def list_users(skip: int = 0, limit: int = 10):
    db = get_database()
    users = await db.users.find().skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "total": await db.users.count_documents({}),
        "users": [
            UserResponse(
                id=u["_id"],
                username=u["username"],
                email=u.get("email"),
                tokens_balance=u.get("tokens_balance", 0),
                total_earned=u.get("total_earned", 0),
                total_donated=u.get("total_donated", 0),
                prayers_count=u.get("prayers_count", 0),
                streak_days=u.get("streak_days", 0),
                created_at=u["created_at"]
            )
            for u in users
        ]
    }