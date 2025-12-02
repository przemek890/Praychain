from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime
import logging
import uuid

from src.utils.celo import send_pray_back_to_treasury
from src.utils.mongodb import get_database
from src.models.donation import DonationRequest, DonationResponse

router = APIRouter(prefix="/api/charity", tags=["charity"])
logger = logging.getLogger(__name__)

def translate_charity_action(action: dict, lang: str) -> dict:
    """
    Translates charity action to the selected language
    """
    translations = action.get("translations", {})
    
    if lang in translations:
        trans = translations[lang]
        action["title"] = trans.get("title", action.get("title"))
        action["description"] = trans.get("description", action.get("description"))
        action["impact_description"] = trans.get("impact_description", action.get("impact_description"))
    
    # Remove translations field from response
    action.pop("translations", None)
    return action

@router.get("/actions")
async def get_charity_actions(lang: str = Query("en", regex="^(en|pl|es)$")):
    """
    Get list of active charity actions with translations
    """
    try:
        db = get_database()
        actions = await db.charity_actions.find({"is_active": True}).to_list(length=100)
        
        # Translate each action
        translated_actions = [translate_charity_action(action, lang) for action in actions]
        
        return {"actions": translated_actions}
        
    except Exception as e:
        logger.error(f"Error fetching charity actions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch charity actions")

@router.get("/actions/{charity_id}")
async def get_charity_action(charity_id: str, lang: str = Query("en", regex="^(en|pl|es)$")):
    """
    Get single charity action with translation
    """
    try:
        db = get_database()
        action = await db.charity_actions.find_one({"_id": charity_id})
        
        if not action:
            raise HTTPException(status_code=404, detail="Charity action not found")
        
        # Apply translation
        translated_action = translate_charity_action(action, lang)
        
        return translated_action
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching charity action: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch charity action")

@router.post("/donate", response_model=DonationResponse)
async def donate_to_charity(request: DonationRequest):
    try:
        db = get_database()
        
        # Check if action exists
        charity = await db.charity_actions.find_one({"_id": request.charity_id})
        if not charity:
            raise HTTPException(status_code=404, detail="Charity action not found")
        
        # Check minimum tokens
        if request.tokens_amount < charity.get("cost_tokens", 0):
            raise HTTPException(
                status_code=400, 
                detail=f"Minimum {charity.get('cost_tokens')} tokens required"
            )
        
        # Check user balance
        user = await db.users.find_one({"_id": request.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        current_balance = user.get("tokens_balance", 0)
        if current_balance < request.tokens_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient token balance. You have {current_balance} tokens"
            )
        
        # Execute donation
        donation_id = str(uuid.uuid4())
        donation = {
            "_id": donation_id,
            "user_id": request.user_id,
            "charity_id": request.charity_id,
            "tokens_spent": request.tokens_amount,
            "created_at": datetime.utcnow(),
            "status": "completed"
        }
        
        await db.charity_donations.insert_one(donation)
        
        # Update user balance
        new_balance = current_balance - request.tokens_amount
        await db.users.update_one(
            {"_id": request.user_id},
            {
                "$set": {
                    "tokens_balance": new_balance
                },
                "$inc": {
                    "total_tokens_donated": request.tokens_amount
                }
            }
        )
        
        # Zaktualizuj statystyki akcji
        await db.charity_actions.update_one(
            {"_id": request.charity_id},
            {
                "$inc": {
                    "total_supported": 1,
                    "total_tokens_raised": request.tokens_amount
                }
            }
        )
        
        tx_hash = None
        try:
            # Check if function is async or not
            from src.utils.celo import send_pray_back_to_treasury
            result = send_pray_back_to_treasury(request.tokens_amount)
            # If async, use await
            if hasattr(result, '__await__'):
                tx_hash = await result
            else:
                tx_hash = result
            logger.info(f"Sent {request.tokens_amount} PRAY to treasury: {tx_hash}")
        except Exception as e:
            logger.error(f"Failed to send tokens to treasury: {e}")
        
        return DonationResponse(
            donation_id=donation_id,
            success=True,
            message=f"Successfully donated {request.tokens_amount} tokens to {charity.get('title')}",
            tokens_spent=request.tokens_amount,
            charity_title=charity.get("title", "Unknown"),
            new_balance=new_balance,
            transaction_hash=tx_hash
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing donation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process donation: {str(e)}")

@router.get("/donations/{user_id}")
async def get_user_donations(user_id: str, skip: int = 0, limit: int = 20):
    """
    Get user donation history
    """
    db = get_database()
    donations = await db.charity_donations.find(
        {"user_id": user_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.charity_donations.count_documents({"user_id": user_id})
    total_tokens_donated = sum(d.get("tokens_spent", 0) for d in donations)
    
    return {
        "total": total,
        "total_tokens_donated": total_tokens_donated,
        "donations": donations
    }

@router.get("/categories")
async def get_charity_categories():
    """
    Returns available charity action categories
    """
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
    """
    Get global charity action statistics
    """
    db = get_database()
    
    total_donations = await db.charity_donations.count_documents({})
    donations = await db.charity_donations.find().to_list(length=None)
    total_tokens_donated = sum(d.get("tokens_spent", 0) for d in donations)
    
    top_actions = await db.charity_actions.find(
        {"is_active": True}
    ).sort("total_supported", -1).limit(5).to_list(length=5)
    
    return {
        "total_donations": total_donations,
        "total_tokens_donated": total_tokens_donated,
        "top_actions": [
            {
                "title": action.get("title"),
                "total_supported": action.get("total_supported", 0),
                "organization": action.get("organization")
            }
            for action in top_actions
        ]
    }

@router.get("/actions/{charity_id}/stats")
async def get_charity_action_stats(charity_id: str):
    """
    Get specific charity action statistics
    """
    db = get_database()
    charity = await db.charity_actions.find_one({"_id": charity_id})
    
    if not charity:
        raise HTTPException(status_code=404, detail="Charity action not found")
    
    donations = await db.charity_donations.find({"charity_id": charity_id}).to_list(length=None)
    total_donations = len(donations)
    total_raised = sum(d.get("tokens_spent", 0) for d in donations)
    
    return {
        "charity_id": charity_id,
        "title": charity.get("title"),
        "total_donations": total_donations,
        "total_raised": total_raised,
        "total_supported": charity.get("total_supported", 0)
    }

@router.get("/user/{user_id}/donations")
async def get_user_charity_stats(user_id: str):
    """
    Get user donation statistics
    """
    db = get_database()
    donations = await db.charity_donations.find({"user_id": user_id}).to_list(length=None)
    
    total_donated = sum(d.get("tokens_spent", 0) for d in donations)
    total_charities = len(set(d.get("charity_id") for d in donations))
    
    return {
        "user_id": user_id,
        "total_donations": len(donations),
        "total_tokens_donated": total_donated,
        "charities_supported": total_charities
    }

@router.get("/leaderboard")
async def get_charity_leaderboard(limit: int = 10):
    """
    Get top donors ranking
    """
    db = get_database()
    
    pipeline = [
        {
            "$group": {
                "_id": "$user_id",
                "total_donated": {"$sum": "$tokens_spent"},
                "donation_count": {"$sum": 1}
            }
        },
        {"$sort": {"total_donated": -1}},
        {"$limit": limit}
    ]
    
    leaderboard = await db.charity_donations.aggregate(pipeline).to_list(length=limit)
    
    return {"leaderboard": leaderboard}

@router.get("/actions/{charity_id}/donors")
async def get_charity_donors(charity_id: str, limit: int = 50):
    """
    Returns list of donors for a given charity action
    """
    try:
        db = get_database()
        
        # Check if action exists
        charity = await db.charity_actions.find_one({"_id": charity_id})
        if not charity:
            raise HTTPException(status_code=404, detail="Charity action not found")
        
        # Aggregate donations by user
        pipeline = [
            {"$match": {"charity_id": charity_id}},
            {
                "$group": {
                    "_id": "$user_id",
                    "total_donated": {"$sum": "$tokens_spent"},
                    "donation_count": {"$sum": 1},
                    "last_donation": {"$max": "$created_at"}
                }
            },
            {"$sort": {"total_donated": -1}},
            {"$limit": limit}
        ]
        
        donors_agg = await db.charity_donations.aggregate(pipeline).to_list(length=limit)
        
        # Get user information
        donors = []
        for donor in donors_agg:
            user = await db.users.find_one({"_id": donor["_id"]})
            donors.append({
                "user_id": donor["_id"],
                "username": user.get("username", "Anonymous") if user else "Anonymous",
                "total_donated": donor["total_donated"],
                "donation_count": donor["donation_count"],
                "last_donation": donor["last_donation"].isoformat()
            })
        
        return {"donors": donors}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching charity donors: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch donors")
