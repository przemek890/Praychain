from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
import math

from src.utils.mongodb import get_database
from src.models.user import UserBase, UserCreate, UserResponse  # ✅ Poprawione

router = APIRouter(prefix="/api/users", tags=["users"])

def calculate_level(total_earned: int):
    """
    Calculate user level based on total earned tokens
    Level 1->2: 100 XP
    Level 2->3: 150 XP
    Level 3->4: 225 XP (each level +50%)
    """
    base_xp = 100
    multiplier = 1.5
    
    level = 1
    xp_for_current_level = 0
    xp_for_next_level = base_xp
    
    while total_earned >= xp_for_next_level:
        level += 1
        xp_for_current_level = xp_for_next_level
        xp_for_next_level += int(base_xp * math.pow(multiplier, level - 1))
    
    current_level_xp = total_earned - xp_for_current_level
    xp_needed_for_next = xp_for_next_level - xp_for_current_level
    
    return {
        "level": level,
        "experience": current_level_xp,
        "experience_to_next_level": xp_needed_for_next
    }

@router.post("")
async def create_user(user: UserCreate):
    """
    Create a new user
    """
    db = get_database()
    
    # Check if user already exists
    existing = await db.users.find_one({"$or": [
        {"username": user.username},
        {"email": user.email}
    ]})
    
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_data = {
        "_id": user.username.lower(),  # Use username as ID
        "username": user.username,
        "email": user.email,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True,
        "tokens_balance": 0,
        "total_earned": 0,
        "total_donated": 0,
        "prayers_count": 0,
        "streak_days": 0
    }
    
    await db.users.insert_one(user_data)
    
    return {
        "id": user_data["_id"],
        "username": user_data["username"],
        "email": user_data["email"],
        "created_at": user_data["created_at"],
        "updated_at": user_data["updated_at"],
        "is_active": user_data["is_active"],
        "tokens_balance": 0,
        "total_earned": 0,
        "total_donated": 0,
        "prayers_count": 0,
        "streak_days": 0,
        "level": 1,
        "experience": 0,
        "experience_to_next_level": 100
    }

@router.get("/{user_id}")
async def get_user(user_id: str):
    """
    Get user by ID with calculated level
    """
    db = get_database()
    user = await db.users.find_one({"_id": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate level
    total_earned = user.get("total_earned", 0)
    level_data = calculate_level(total_earned)
    
    return {
        "id": user["_id"],
        "username": user.get("username"),
        "email": user.get("email"),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
        "is_active": user.get("is_active", True),
        "tokens_balance": user.get("tokens_balance", 0),
        "total_earned": total_earned,
        "total_donated": user.get("total_donated", 0),
        "prayers_count": user.get("prayers_count", 0),
        "streak_days": user.get("streak_days", 0),
        "level": level_data["level"],
        "experience": level_data["experience"],
        "experience_to_next_level": level_data["experience_to_next_level"]
    }

@router.patch("/{user_id}/add-tokens")
async def add_tokens_to_user(user_id: str, tokens: int):
    """
    Add tokens to user's balance after prayer completion
    """
    db = get_database()
    
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_balance = user.get("tokens_balance", 0) + tokens
    new_total_earned = user.get("total_earned", 0) + tokens
    new_prayers_count = user.get("prayers_count", 0) + 1
    
    await db.users.update_one(
        {"_id": user_id},
        {
            "$set": {
                "tokens_balance": new_balance,
                "total_earned": new_total_earned,
                "prayers_count": new_prayers_count,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Calculate new level
    level_data = calculate_level(new_total_earned)
    
    return {
        "success": True,
        "tokens_balance": new_balance,
        "total_earned": new_total_earned,
        "prayers_count": new_prayers_count,
        "level": level_data["level"],
        "experience": level_data["experience"],
        "experience_to_next_level": level_data["experience_to_next_level"]
    }