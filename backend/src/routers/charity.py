from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
import logging
import uuid

from src.utils.mongodb import get_database
from src.models.donation import DonationRequest, DonationResponse

router = APIRouter(prefix="/api/charity", tags=["charity"])
logger = logging.getLogger(__name__)

@router.get("/actions")
async def get_charity_actions():
    try:
        db = get_database()
        actions = await db.charity_actions.find({"is_active": True}).to_list(length=100)
        return {"actions": actions}
    except Exception as e:
        logger.error(f"Error fetching charity actions: {e}")
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
        
        # Check user exists
        user = await db.users.find_one({"_id": request.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user["tokens_balance"] < request.tokens_amount:
            raise HTTPException(status_code=400, detail="Insufficient tokens")
        
        # Check charity exists
        charity = await db.charity_actions.find_one({"_id": request.charity_id})
        if not charity:
            raise HTTPException(status_code=404, detail="Charity not found")
        
        if not charity.get("is_active", True):
            raise HTTPException(status_code=400, detail="Charity is not active")
        
        if request.tokens_amount < charity.get("cost_tokens", 0):
            raise HTTPException(
                status_code=400, 
                detail=f"Minimum donation is {charity.get('cost_tokens', 0)} tokens"
            )
        
        # Deduct tokens from user
        new_balance = user["tokens_balance"] - request.tokens_amount
        await db.users.update_one(
            {"_id": request.user_id},
            {
                "$inc": {
                    "tokens_balance": -request.tokens_amount,
                    "total_donated": request.tokens_amount
                },
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Update token balance
        await db.token_balances.update_one(
            {"user_id": request.user_id},
            {
                "$inc": {
                    "balance": -request.tokens_amount,
                    "total_donated": request.tokens_amount
                },
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Update charity stats
        await db.charity_actions.update_one(
            {"_id": request.charity_id},
            {
                "$inc": {
                    "total_supported": 1,
                    "total_tokens_raised": request.tokens_amount
                },
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # If there's a goal, update tokens_remaining
        if charity.get("goal_tokens"):
            tokens_remaining = charity["goal_tokens"] - (charity.get("total_tokens_raised", 0) + request.tokens_amount)
            await db.charity_actions.update_one(
                {"_id": request.charity_id},
                {"$set": {"tokens_remaining": max(0, tokens_remaining)}}
            )
        
        # Create donation record
        donation_id = str(uuid.uuid4())
        donation = {
            "_id": donation_id,
            "user_id": request.user_id,
            "charity_id": request.charity_id,
            "charity_title": charity["title"],
            "tokens_spent": request.tokens_amount,
            "created_at": datetime.utcnow(),
            "status": "completed"
        }
        await db.charity_donations.insert_one(donation)
        
        # Create token transaction
        transaction = {
            "_id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "type": "spend",
            "amount": -request.tokens_amount,
            "source": f"charity:{request.charity_id}",
            "description": f"Donation to {charity['title']}",
            "created_at": datetime.utcnow()
        }
        await db.token_transactions.insert_one(transaction)
        
        logger.info(f"User {request.user_id} donated {request.tokens_amount} tokens to {charity['title']}")
        
        return DonationResponse(
            success=True,
            donation_id=donation_id,
            tokens_spent=request.tokens_amount,
            charity_title=charity["title"],
            new_balance=new_balance,
            message=f"Thank you for donating {request.tokens_amount} tokens to {charity['title']}!"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing donation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
async def get_charity_action_stats(charity_id: str):
    db = get_database()
    charity = await db.charity_actions.find_one({"_id": charity_id})
    if not charity:
        raise HTTPException(status_code=404, detail="Charity not found")
    
    donations = await db.charity_donations.find({"charity_id": charity_id}).to_list(length=None)
    total_donations = len(donations)
    total_raised = sum(d["tokens_spent"] for d in donations)
    
    return {
        "charity_id": charity_id,
        "title": charity["title"],
        "total_donations": total_donations,
        "total_raised": total_raised,
        "total_supported": charity.get("total_supported", 0)
    }

@router.get("/user/{user_id}/donations")
async def get_user_charity_stats(user_id: str):
    db = get_database()
    donations = await db.charity_donations.find({"user_id": user_id}).to_list(length=None)
    
    total_donated = sum(d["tokens_spent"] for d in donations)
    total_charities = len(set(d["charity_id"] for d in donations))
    
    return {
        "user_id": user_id,
        "total_donations": len(donations),
        "total_tokens_donated": total_donated,
        "charities_supported": total_charities
    }

@router.get("/leaderboard")
async def get_charity_leaderboard(limit: int = 10):
    db = get_database()
    
    # Aggregate donations by user
    pipeline = [
        {
            "$group": {
                "_id": "$user_id",
                "total_donated": {"$sum": "$tokens_spent"},
                "donation_count": {"$count": {}}
            }
        },
        {"$sort": {"total_donated": -1}},
        {"$limit": limit}
    ]
    
    leaderboard = await db.charity_donations.aggregate(pipeline).to_list(length=limit)
    
    return {"leaderboard": leaderboard}
