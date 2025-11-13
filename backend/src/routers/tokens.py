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