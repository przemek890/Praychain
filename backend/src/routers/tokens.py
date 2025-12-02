from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import uuid
import logging

from src.utils.celo import send_pray_to_user_wallet, get_pray_balance
from src.utils.mongodb import get_database
from src.models.token import TokenBalance, AddTokensRequest, AwardTokensRequest

router = APIRouter(prefix="/api/tokens", tags=["tokens"])
logger = logging.getLogger(__name__)


async def get_user_wallet_address(db, user_id: str) -> Optional[str]:
    """
    Pobiera wallet_address użytkownika z bazy danych.
    
    Args:
        db: Połączenie z bazą danych
        user_id: ID użytkownika (np. "krzysiot444")
        
    Returns:
        wallet_address lub None jeśli nie znaleziono
    """
    user = await db.users.find_one({"_id": user_id})
    if user:
        return user.get("wallet_address")
    return None


@router.get("/balance/{user_id}")
async def get_token_balance(user_id: str):
    try:
        db = get_database()
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


@router.get("/on-chain-balance/{user_id}")
async def get_on_chain_balance(user_id: str):
    """
    Pobiera saldo PRAY on-chain dla użytkownika.
    Wymaga wallet_address w bazie danych.
    """
    try:
        db = get_database()
        wallet_address = await get_user_wallet_address(db, user_id)
        
        if not wallet_address:
            raise HTTPException(
                status_code=404, 
                detail=f"User {user_id} has no wallet_address configured"
            )
        
        balance = get_pray_balance(wallet_address)
        
        return {
            "user_id": user_id,
            "wallet_address": wallet_address,
            "on_chain_balance": balance
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching on-chain balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add")
async def add_tokens_manually(request: AddTokensRequest):
    try:
        db = get_database()
        
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
    try:
        db = get_database()
        
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
    try:
        db = get_database()
        
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
    try:
        db = get_database()
        
        if request.captcha_accuracy < 0.5:
            logger.warning(f"CAPTCHA failed for user {request.user_id}: {request.captcha_accuracy}")
            
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
            
            balance_doc = await db.token_balances.find_one({"user_id": request.user_id})
            current_balance = balance_doc["current_balance"] if balance_doc else 0
            
            return {
                "success": False,
                "tokens_earned": 0,
                "reason": f"CAPTCHA verification failed (accuracy: {request.captcha_accuracy * 100:.0f}%). Required: 50%+",
                "current_balance": current_balance
            }
        
        accuracy_points = request.text_accuracy * 50
        stability_points = request.emotional_stability * 25
        fluency_points = request.speech_fluency * 15
        focus_points = request.focus_score * 10
        
        total_tokens = int(accuracy_points + stability_points + fluency_points + focus_points)
        
        penalty_applied = False
        if request.text_accuracy < 0.3:
            total_tokens = max(0, total_tokens - 20)
            penalty_applied = True
        
        total_tokens = max(0, min(100, total_tokens))
        
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
    Internal function for awarding tokens.
    Gets wallet_address from database and sends PRAY on-chain.
    """
    try:
        # Get user wallet_address from database
        user = await db.users.find_one({"_id": user_id})
        user_wallet_address = user.get("wallet_address") if user else None
        
        if not user_wallet_address:
            logger.warning(f"User {user_id} has no wallet_address in database, skipping on-chain transfer")
        else:
            logger.info(f"User {user_id} wallet_address: {user_wallet_address}")
        
        # Update user off-chain balance in Mongo
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
        
        # Also update tokens_balance in users collection
        await db.users.update_one(
            {"_id": user_id},
            {
                "$inc": {
                    "tokens_balance": tokens_earned,
                    "total_earned": tokens_earned
                },
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Wyliczenie breakdown'u do historii
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
            "description": (
                f"Prayer reading (accuracy: {int(text_accuracy * 100)}%, "
                f"captcha: {int(captcha_accuracy * 100)}%)"
            ),
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

        # Send PRAY on-chain to user wallet from database
        tx_hash = None
        try:
            if tokens_earned > 0 and user_wallet_address:
                tx_hash = send_pray_to_user_wallet(user_wallet_address, tokens_earned)
                
                if tx_hash:
                    # Zapisz info o on-chain tx
                    await db.token_transactions.update_one(
                        {"_id": transaction["_id"]},
                        {"$set": {
                            "tx_hash": tx_hash, 
                            "on_chain": True,
                            "recipient_wallet": user_wallet_address
                        }}
                    )
                    logger.info(
                        f"On-chain: sent {tokens_earned} PRAY to {user_wallet_address} (tx: {tx_hash})"
                    )
            elif tokens_earned > 0:
                logger.warning(f"User {user_id} has no wallet_address, tokens awarded off-chain only")
            else:
                logger.info("No tokens_earned, skipping on-chain transfer")
                
        except Exception as onchain_err:
            # Don't block entire logic due to on-chain error - log and continue
            logger.error(f"Error sending on-chain PRAY to {user_wallet_address}: {onchain_err}")

        logger.info(
            f"Awarded {tokens_earned} tokens to user {user_id} "
            f"(captcha: {int(captcha_accuracy * 100)}%)"
        )
        
        return tokens_earned
        
    except Exception as e:
        logger.error(f"Error awarding tokens: {str(e)}")
        raise