from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
import uuid
import logging

from src.utils.mongodb import get_database
from src.models.charity import CharityAction  # ✅ Tylko CharityAction
from src.models.donation import DonationRequest, CharityDonation, DonationResponse  # ✅ Donacje osobno

router = APIRouter(prefix="/api/charity", tags=["charity"])
logger = logging.getLogger(__name__)


@router.get("/actions")
async def list_charity_actions(
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """Pobierz listę dostępnych akcji charytatywnych"""
    db = get_database()
    
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    actions = await db.charity_actions.find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db.charity_actions.count_documents(query)
    
    return {
        "total": total,
        "actions": actions
    }

@router.get("/actions/{charity_id}")
async def get_charity_action(charity_id: str):
    """Pobierz szczegóły akcji charytatywnej"""
    db = get_database()
    
    action = await db.charity_actions.find_one({"_id": charity_id})
    
    if not action:
        raise HTTPException(status_code=404, detail="Charity action not found")
    
    return action

@router.post("/donate")
async def donate_to_charity(request: DonationRequest):
    """
    ✅ User przekazuje tokeny na zbiórkę charytatywną
    - Sprawdza saldo użytkownika
    - Odejmuje tokeny
    - Zapisuje transakcję
    """
    db = get_database()
    
    # 1. Sprawdź czy akcja istnieje
    charity = await db.charity_actions.find_one({"_id": request.charity_id})
    if not charity:
        raise HTTPException(status_code=404, detail="Charity action not found")
    
    if not charity.get("is_active", False):
        raise HTTPException(status_code=400, detail="Charity action is not active")
    
    # 2. ✅ Sprawdź czy user ma wystarczająco tokenów
    balance = await db.token_balances.find_one({"user_id": request.user_id})
    if not balance or balance["current_balance"] < request.tokens_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient tokens. Required: {request.tokens_amount}, Available: {balance['current_balance'] if balance else 0}"
        )
    
    if request.tokens_amount <= 0:
        raise HTTPException(status_code=400, detail="Token amount must be positive")
    
    try:
        # 3. ✅ Odejmij tokeny użytkownikowi
        await db.token_balances.update_one(
            {"user_id": request.user_id},
            {
                "$inc": {
                    "total_spent": request.tokens_amount,
                    "current_balance": -request.tokens_amount
                },
                "$set": {"last_updated": datetime.utcnow()}
            }
        )
        
        # 4. ✅ Zapisz donację
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
        
        # 5. ✅ Zaktualizuj statystyki zbiórki
        await db.charity_actions.update_one(
            {"_id": request.charity_id},
            {
                "$inc": {
                    "total_supported": 1,
                    "total_tokens_raised": request.tokens_amount  # ✅ Nowe pole
                }
            }
        )
        
        # 6. Dodaj transakcję tokenów
        transaction = {
            "user_id": request.user_id,
            "type": "spend",
            "amount": request.tokens_amount,
            "source": f"charity:{request.charity_id}",
            "charity_title": charity["title"],
            "created_at": datetime.utcnow()
        }
        await db.token_transactions.insert_one(transaction)
        
        logger.info(f"User {request.user_id} donated {request.tokens_amount} tokens to {charity['title']}")
        
        return {
            "success": True,
            "donation_id": donation_id,
            "tokens_spent": request.tokens_amount,
            "charity_title": charity["title"],
            "new_balance": balance["current_balance"] - request.tokens_amount
        }
        
    except Exception as e:
        logger.error(f"Error processing donation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing donation: {str(e)}")

@router.get("/donations/{user_id}")
async def get_user_donations(user_id: str, skip: int = 0, limit: int = 20):
    """Pobierz historię dotacji użytkownika"""
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
    """Get charity action categories"""
    return {
        "categories": [
            {"id": "health", "name": "Health", "icon": "❤️"},
            {"id": "education", "name": "Education", "icon": "📚"},
            {"id": "environment", "name": "Environment", "icon": "🌍"},
            {"id": "humanitarian", "name": "Humanitarian Aid", "icon": "🤝"},
            {"id": "animals", "name": "Animals", "icon": "🐾"},
            {"id": "children", "name": "Children", "icon": "👶"}
        ]
    }

@router.get("/stats")
async def get_charity_stats():
    """Statystyki dotacji"""
    db = get_database()
    
    total_donations = await db.charity_donations.count_documents({})
    
    donations = await db.charity_donations.find().to_list(length=None)
    total_tokens_donated = sum(d["tokens_spent"] for d in donations)
    
    # Top akcje
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
    """
    ✅ Statystyki konkretnej zbiórki:
    - Ile osób wsparło
    - Ile tokenów zebrano
    - Ostatnie donacje
    """
    db = get_database()
    
    charity = await db.charity_actions.find_one({"_id": charity_id})
    if not charity:
        raise HTTPException(status_code=404, detail="Charity action not found")
    
    # Policz ile tokenów zebrano
    donations = await db.charity_donations.find({"charity_id": charity_id}).to_list(length=None)
    total_tokens_raised = sum(d["tokens_spent"] for d in donations)
    total_supporters = len(set(d["user_id"] for d in donations))
    
    # Ostatnie donacje
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
                "user_id": d["user_id"][:8] + "...",  # Anonimizuj
                "tokens": d["tokens_spent"],
                "date": d["created_at"]
            }
            for d in recent_donations
        ]
    }

@router.get("/user/{user_id}/donations")
async def get_user_charity_stats(user_id: str):
    """
    ✅ Statystyki użytkownika:
    - Ile tokenów przekazał łącznie
    - Na jakie zbiórki przekazał
    - Historia donacji
    """
    db = get_database()
    
    donations = await db.charity_donations.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(length=None)
    
    total_tokens_donated = sum(d["tokens_spent"] for d in donations)
    
    # Grupuj po zbiórkach
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
            for d in donations[:20]  # Ostatnie 20
        ]
    }

@router.get("/leaderboard")
async def get_charity_leaderboard(limit: int = 10):
    """
    ✅ Ranking zbiórek:
    - Które zbiórki zebrały najwięcej tokenów
    - Które mają najwięcej wspierających
    """
    db = get_database()
    
    # Pobierz wszystkie aktywne zbiórki
    charities = await db.charity_actions.find(
        {"is_active": True}
    ).to_list(length=None)
    
    # Policz tokeny dla każdej
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
    
    # Sortuj po tokenach
    leaderboard.sort(key=lambda x: x["total_tokens_raised"], reverse=True)
    
    return {
        "leaderboard": leaderboard[:limit]
    }