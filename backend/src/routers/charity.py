from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
import logging
import uuid

from src.utils.celo import send_pray_back_to_treasury
from src.utils.mongodb import get_database
from src.models.donation import DonationRequest, DonationResponse

router = APIRouter(prefix="/api/charity", tags=["charity"])
logger = logging.getLogger(__name__)

@router.get("/actions")
async def get_charity_actions():
    try:
        db = get_database()
        actions = await db.charity_actions.find({"is_active": True}).to_list(length=100)
        for action in actions:
            action["_id"] = str(action["_id"])
            if "total_tokens_raised" not in action:
                action["total_tokens_raised"] = 0
            if "total_supported" not in action:
                action["total_supported"] = 0
        return {"actions": actions}
    except Exception as e:
        logger.error(f"Error fetching charity actions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch charity actions")

@router.get("/actions/{charity_id}")
async def get_charity_action(charity_id: str):
    db = get_database()
    action = await db.charity_actions.find_one({"_id": charity_id})
    if not action:
        raise HTTPException(status_code=404, detail="Charity action not found")
    return action

@router.post("/donate", response_model=DonationResponse)
async def donate_to_charity(request: DonationRequest):
    try:
        db = get_database()

        charity = await db.charity_actions.find_one({"_id": request.charity_id})
        if not charity:
            raise HTTPException(status_code=404, detail="Charity action not found")
        if not charity.get("is_active", False):
            raise HTTPException(status_code=400, detail="Charity action is not active")

        user_balance = await db.token_balances.find_one({"user_id": request.user_id})
        if not user_balance:
            raise HTTPException(status_code=404, detail="User balance not found")

        current_balance = user_balance.get("current_balance", 0)
        if current_balance < request.tokens_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient tokens. You have {current_balance}, need {request.tokens_amount}"
            )

        try:
            tx_hash = send_pray_back_to_treasury(request.tokens_amount)
        except Exception:
            raise HTTPException(status_code=500, detail="On-chain PRAY transfer failed")

        new_balance = current_balance - request.tokens_amount
        await db.token_balances.update_one(
            {"user_id": request.user_id},
            {
                "$set": {"current_balance": new_balance, "last_updated": datetime.utcnow()},
                "$inc": {"total_spent": request.tokens_amount}
            }
        )

        await db.charity_actions.update_one(
            {"_id": request.charity_id},
            {"$inc": {"total_supported": request.tokens_amount}}
        )

        donation_id = str(uuid.uuid4())
        donation = {
            "_id": donation_id,
            "user_id": request.user_id,
            "charity_id": request.charity_id,
            "charity_title": charity["title"],
            "tokens_spent": request.tokens_amount,
            "status": "completed",
            "created_at": datetime.utcnow(),
            "tx_hash": tx_hash,
            "on_chain": True
        }
        await db.charity_donations.insert_one(donation)

        transaction = {
            "_id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "type": "spend",
            "amount": request.tokens_amount,
            "source": f"charity:{request.charity_id}",
            "description": f"Donated to: {charity['title']}",
            "created_at": datetime.utcnow(),
            "tx_hash": tx_hash,
            "on_chain": True
        }
        await db.token_transactions.insert_one(transaction)

        return DonationResponse(
            success=True,
            donation_id=donation_id,
            tokens_spent=request.tokens_amount,
            charity_title=charity["title"],
            new_balance=new_balance,
            tx_hash=tx_hash,
            message=f"Successfully donated {request.tokens_amount} tokens to {charity['title']}"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing donation: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing donation: {str(e)}")

@router.get("/donations/{user_id}")
async def get_user_donations(user_id: str, skip: int = 0, limit: int = 20):
    db = get_database()
    donations = await db.charity_donations.find(
        {"user_id": user_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.charity_donations.count_documents({"user_id": user_id})
    total_tokens_donated = sum(d["tokens_spent"] for d in donations)
    return {
        "total": total,
        "total_tokens_donated": total_tokens_donated,
        "donations": donations
    }

@router.get("/categories")
async def get_charity_categories():
    return {
        "categories": [
            {"id": "health", "name": "Health"},
            {"id": "education", "name": "Education"},
            {"id": "environment", "name": "Environment"},
            {"id": "humanitarian", "name": "Humanitarian Aid"},
            {"id": "animals", "name": "Animals"},
            {"id": "children", "name": "Children"}
        ]
    }

@router.get("/stats")
async def get_charity_stats():
    db = get_database()
    total_donations = await db.charity_donations.count_documents({})
    donations = await db.charity_donations.find().to_list(length=None)
    total_tokens_donated = sum(d["tokens_spent"] for d in donations)
    top_actions = await db.charity_actions.find(
        {"is_active": True}
    ).sort("total_supported", -1).limit(5).to_list(length=5)
    return {
        "total_donations": total_donations,
        "total_tokens_donated": total_tokens_donated,
        "top_actions": [
            {
                "title": action["title"],
                "total_supported": action["total_supported"],
                "organization": action["organization"]
            }
            for action in top_actions
        ]
    }

@router.get("/actions/{charity_id}/stats")
async def get_charity_stats(charity_id: str):
    db = get_database()
    charity = await db.charity_actions.find_one({"_id": charity_id})
    if not charity:
        raise HTTPException(status_code=404, detail="Charity action not found")
    donations = await db.charity_donations.find({"charity_id": charity_id}).to_list(length=None)
    total_tokens_raised = sum(d["tokens_spent"] for d in donations)
    total_supporters = len(set(d["user_id"] for d in donations))
    recent_donations = await db.charity_donations.find(
        {"charity_id": charity_id}
    ).sort("created_at", -1).limit(10).to_list(length=10)
    return {
        "charity_id": charity_id,
        "title": charity["title"],
        "description": charity["description"],
        "organization": charity["organization"],
        "total_tokens_raised": total_tokens_raised,
        "total_supporters": total_supporters,
        "cost_tokens": charity["cost_tokens"],
        "recent_donations": [
            {
                "user_id": d["user_id"][:8] + "...",
                "tokens": d["tokens_spent"],
                "date": d["created_at"]
            }
            for d in recent_donations
        ]
    }

@router.get("/user/{user_id}/donations")
async def get_user_charity_stats(user_id: str):
    db = get_database()
    donations = await db.charity_donations.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(length=None)
    total_tokens_donated = sum(d["tokens_spent"] for d in donations)
    charity_breakdown = {}
    for donation in donations:
        charity_id = donation["charity_id"]
        if charity_id not in charity_breakdown:
            charity_breakdown[charity_id] = {
                "charity_id": charity_id,
                "charity_title": donation["charity_title"],
                "total_tokens": 0,
                "donations_count": 0
            }
        charity_breakdown[charity_id]["total_tokens"] += donation["tokens_spent"]
        charity_breakdown[charity_id]["donations_count"] += 1
    return {
        "user_id": user_id,
        "total_tokens_donated": total_tokens_donated,
        "total_donations": len(donations),
        "charities_supported": len(charity_breakdown),
        "breakdown": list(charity_breakdown.values()),
        "recent_donations": [
            {
                "donation_id": d["_id"],
                "charity_title": d["charity_title"],
                "tokens_spent": d["tokens_spent"],
                "date": d["created_at"],
                "status": d["status"]
            }
            for d in donations[:20]
        ]
    }

@router.get("/leaderboard")
async def get_charity_leaderboard(limit: int = 10):
    db = get_database()
    charities = await db.charity_actions.find(
        {"is_active": True}
    ).to_list(length=None)
    leaderboard = []
    for charity in charities:
        donations = await db.charity_donations.find(
            {"charity_id": charity["_id"]}
        ).to_list(length=None)
        total_tokens = sum(d["tokens_spent"] for d in donations)
        supporters_count = len(set(d["user_id"] for d in donations))
        leaderboard.append({
            "charity_id": charity["_id"],
            "title": charity["title"],
            "organization": charity["organization"],
            "category": charity["category"],
            "total_tokens_raised": total_tokens,
            "supporters_count": supporters_count,
            "image_url": charity.get("image_url", "")
        })
    leaderboard.sort(key=lambda x: x["total_tokens_raised"], reverse=True)
    return {
        "leaderboard": leaderboard[:limit]
    }
