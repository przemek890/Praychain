from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import uuid
import logging

from src.utils.mongodb import get_database
from src.models.token import TokenBalance

router = APIRouter(prefix="/api/tokens", tags=["tokens"])
logger = logging.getLogger(__name__)

class AddTokensRequest(BaseModel):
    user_id: str
    amount: int
    source: str = "admin:manual"
    description: str = ""

class AwardTokensRequest(BaseModel):
    user_id: str
    transcription_id: str
    text_accuracy: float  # 0.0 - 1.0
    emotional_stability: float  # 0.0 - 1.0
    speech_fluency: float  # 0.0 - 1.0
    captcha_accuracy: float  # 0.0 - 1.0 - NOWE!
    focus_score: float  # 0.0 - 1.0

@router.get("/balance/{user_id}")
async def get_token_balance(user_id: str):
    """Get current token balance for a user"""
    try:
        db = get_database()  # ✅ Usuń await
        balance = await db.token_balances.find_one({"user_id": user_id})
        
        if not balance:
            return TokenBalance(
                user_id=user_id,
                total_earned=0,
                total_spent=0,
                current_balance=0,
                last_updated=datetime.utcnow()
            )
        
        balance["_id"] = str(balance["_id"])
        return balance
        
    except Exception as e:
        logger.error(f"Error fetching token balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add")
async def add_tokens_manually(request: AddTokensRequest):
    """🔑 ADMIN ONLY: Manually add tokens to a user account"""
    try:
        db = get_database()  # ✅ Usuń await
        
        balance_doc = await db.token_balances.find_one({"user_id": request.user_id})
        
        if not balance_doc:
            balance_doc = {
                "user_id": request.user_id,
                "total_earned": request.amount,
                "total_spent": 0,
                "current_balance": request.amount,
                "last_updated": datetime.utcnow()
            }
            await db.token_balances.insert_one(balance_doc)
        else:
            new_total_earned = balance_doc["total_earned"] + request.amount
            new_current_balance = balance_doc["current_balance"] + request.amount
            
            await db.token_balances.update_one(
                {"user_id": request.user_id},
                {
                    "$set": {
                        "total_earned": new_total_earned,
                        "current_balance": new_current_balance,
                        "last_updated": datetime.utcnow()
                    }
                }
            )
        
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "type": "earn",
            "amount": request.amount,
            "source": request.source,
            "description": request.description or f"Admin added {request.amount} tokens",
            "created_at": datetime.utcnow()
        }
        await db.token_transactions.insert_one(transaction)
        
        updated_balance = await db.token_balances.find_one({"user_id": request.user_id})
        
        return {
            "success": True,
            "message": f"Added {request.amount} tokens to user {request.user_id}",
            "new_balance": updated_balance["current_balance"],
            "transaction_id": transaction["id"]
        }
        
    except Exception as e:
        logger.error(f"Error adding tokens: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/{user_id}")
async def get_transactions(user_id: str, skip: int = 0, limit: int = 20):
    """Get transaction history for a user"""
    try:
        db = get_database()  # ✅ Usuń await
        
        transactions = await db.token_transactions.find(
            {"user_id": user_id}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        for transaction in transactions:
            transaction["_id"] = str(transaction["_id"])
        
        return {
            "transactions": transactions,
            "total": await db.token_transactions.count_documents({"user_id": user_id})
        }
        
    except Exception as e:
        logger.error(f"Error fetching transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leaderboard")
async def get_leaderboard(limit: int = 10):
    """Get top token earners"""
    try:
        db = get_database()  # ✅ Usuń await
        
        top_users = await db.token_balances.find().sort(
            "total_earned", -1
        ).limit(limit).to_list(length=limit)
        
        for user in top_users:
            user["_id"] = str(user["_id"])
        
        return {"leaderboard": top_users}
        
    except Exception as e:
        logger.error(f"Error fetching leaderboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/award")
async def award_tokens_for_prayer(request: AwardTokensRequest):
    """
    🎯 Przyznaje tokeny na podstawie analizy modlitwy
    
    ⚠️ CAPTCHA: Jeśli captcha_accuracy < 0.5 (50%) → 0 tokenów
    
    Wagi:
    - Text Accuracy: 50%
    - Emotional Stability: 25%
    - Speech Fluency: 15%
    - Focus Score: 10%
    """
    try:
        db = get_database()
        
        # ✅ CAPTCHA CHECK - jeśli poniżej 50%, to 0 tokenów
        if request.captcha_accuracy < 0.5:
            logger.warning(f"CAPTCHA failed for user {request.user_id}: {request.captcha_accuracy}")
            
            # Zapisz transakcję z 0 tokenami
            transaction = {
                "id": str(uuid.uuid4()),
                "user_id": request.user_id,
                "type": "earn",
                "amount": 0,
                "source": f"prayer:{request.transcription_id}",
                "description": f"CAPTCHA failed (accuracy: {request.captcha_accuracy * 100:.0f}%)",
                "created_at": datetime.utcnow(),
                "captcha_failed": True
            }
            await db.token_transactions.insert_one(transaction)
            
            return {
                "success": False,
                "tokens_earned": 0,
                "reason": f"CAPTCHA verification failed (accuracy: {request.captcha_accuracy * 100:.0f}%). Required: 50%+",
                "current_balance": (await db.token_balances.find_one({"user_id": request.user_id}))["current_balance"] if await db.token_balances.find_one({"user_id": request.user_id}) else 0
            }
        
        # ✅ Oblicz tokeny (0-100)
        accuracy_points = request.text_accuracy * 50  # 0-50 punktów
        stability_points = request.emotional_stability * 25  # 0-25 punktów
        fluency_points = request.speech_fluency * 15  # 0-15 punktów
        focus_points = request.focus_score * 10  # 0-10 punktów
        
        total_tokens = int(accuracy_points + stability_points + fluency_points + focus_points)
        
        # ✅ KARA za bardzo słabe czytanie (accuracy < 0.3)
        penalty_applied = False
        if request.text_accuracy < 0.3:
            total_tokens = max(0, total_tokens - 20)
            penalty_applied = True
        
        total_tokens = max(0, min(100, total_tokens))
        
        # ✅ Dodaj tokeny do salda użytkownika
        balance_doc = await db.token_balances.find_one({"user_id": request.user_id})
        
        if not balance_doc:
            balance_doc = {
                "user_id": request.user_id,
                "total_earned": total_tokens,
                "total_spent": 0,
                "current_balance": total_tokens,
                "last_updated": datetime.utcnow()
            }
            await db.token_balances.insert_one(balance_doc)
        else:
            new_total_earned = balance_doc["total_earned"] + total_tokens
            new_current_balance = balance_doc["current_balance"] + total_tokens
            
            await db.token_balances.update_one(
                {"user_id": request.user_id},
                {
                    "$set": {
                        "total_earned": new_total_earned,
                        "current_balance": new_current_balance,
                        "last_updated": datetime.utcnow()
                    }
                }
            )
        
        # ✅ Zapisz transakcję
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "type": "earn",
            "amount": total_tokens,
            "source": f"prayer:{request.transcription_id}",
            "description": f"Prayer reading (accuracy: {request.text_accuracy * 100:.0f}%, captcha: {request.captcha_accuracy * 100:.0f}%)",
            "created_at": datetime.utcnow(),
            "breakdown": {
                "accuracy_points": round(accuracy_points, 1),
                "stability_points": round(stability_points, 1),
                "fluency_points": round(fluency_points, 1),
                "focus_points": round(focus_points, 1),
                "penalty_applied": penalty_applied,
                "captcha_accuracy": request.captcha_accuracy
            }
        }
        await db.token_transactions.insert_one(transaction)
        
        updated_balance = await db.token_balances.find_one({"user_id": request.user_id})
        
        logger.info(f"Awarded {total_tokens} tokens to user {request.user_id} (captcha: {request.captcha_accuracy * 100:.0f}%)")
        
        return {
            "success": True,
            "tokens_earned": total_tokens,
            "new_balance": updated_balance["current_balance"],
            "transaction_id": transaction["id"],
            "breakdown": transaction["breakdown"]
        }
        
    except Exception as e:
        logger.error(f"Error awarding tokens: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def award_tokens_internal(
    db,
    user_id: str,
    transcription_id: str,
    tokens_earned: int,
    text_accuracy: float,
    emotional_stability: float,
    speech_fluency: float,
    captcha_accuracy: float,
    focus_score: float
):
    """
    ✅ Wewnętrzna funkcja przyznawania tokenów (bez HTTP endpoint)
    """
    try:
        # Update user balance
        balance = await db.token_balances.find_one({"user_id": user_id})
        
        if balance:
            await db.token_balances.update_one(
                {"user_id": user_id},
                {
                    "$inc": {
                        "total_earned": tokens_earned,
                        "current_balance": tokens_earned
                    },
                    "$set": {"last_updated": datetime.utcnow()}
                }
            )
        else:
            await db.token_balances.insert_one({
                "user_id": user_id,
                "total_earned": tokens_earned,
                "total_spent": 0,
                "current_balance": tokens_earned,
                "last_updated": datetime.utcnow()
            })
        
        # Create transaction record
        accuracy_points = text_accuracy * 50
        stability_points = emotional_stability * 25
        fluency_points = speech_fluency * 15
        focus_points = focus_score * 10
        
        transaction = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "earn",
            "amount": tokens_earned,
            "source": f"prayer:{transcription_id}",
            "description": f"Prayer reading (accuracy: {int(text_accuracy*100)}%, captcha: {int(captcha_accuracy*100)}%)",
            "created_at": datetime.utcnow(),
            "breakdown": {
                "accuracy_points": round(accuracy_points, 1),
                "stability_points": round(stability_points, 1),
                "fluency_points": round(fluency_points, 1),
                "focus_points": round(focus_points, 1),
                "penalty_applied": text_accuracy < 0.3,
                "captcha_accuracy": round(captcha_accuracy, 2)
            }
        }
        
        await db.token_transactions.insert_one(transaction)
        
        logger.info(f"Awarded {tokens_earned} tokens to user {user_id} (captcha: {int(captcha_accuracy*100)}%)")
        
        return tokens_earned
        
    except Exception as e:
        logger.error(f"Error awarding tokens: {str(e)}")
        raise