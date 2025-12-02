from fastapi import APIRouter, HTTPException, Query
import logging
import random
from datetime import datetime

from src.data.prayers import CLASSIC_PRAYERS
from src.data.quotes import SHORT_BIBLE_QUOTES
from src.utils.bible_api import bible_api

router = APIRouter(prefix="/api/bible", tags=["bible"])
logger = logging.getLogger(__name__)

@router.get("/random-quote")
async def get_random_bible_quote(lang: str = Query("en", regex="^(en|pl|es)$")):
    """
    Zwraca losowy cytat biblijny w wybranym języku
    """
    try:
        verse = await bible_api.get_random_verse(lang)
        return verse
    except Exception as e:
        logger.error(f"Error fetching random quote: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch random quote")

@router.get("/short-quote")
async def get_short_quote(lang: str = Query("en", regex="^(en|pl|es)$")):
    """
    Zwraca krótki cytat biblijny (ZAWSZE z lokalnych danych)
    """
    quote = random.choice(SHORT_BIBLE_QUOTES)
    text_key = f"text_{lang}"
    
    return {
        "text": quote.get(text_key, quote["text_en"]),
        "reference": quote["reference"],
        "category": quote.get("category", "inspiration"),
        "type": "short_quote"
    }

@router.get("/daily-reading")
async def get_daily_reading(lang: str = Query("en", regex="^(en|pl|es)$")):
    """
    Generuje dzienne czytanie z uwzględnieniem języka
    """
    try:
        today = datetime.now().date()
        seed = int(today.strftime('%Y%m%d'))
        random.seed(seed)
        
        books = bible_api.get_books(lang)
        book = random.choice(books)
        
        max_chapter = book.get("chapters", 30)
        chapter_num = random.randint(1, min(max_chapter, 30))
        
        chapter_data = await bible_api.get_chapter(book["id"], chapter_num, lang)
        
        return {
            **chapter_data,
            "date": today.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching daily reading: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch daily reading: {str(e)}")

@router.get("/books")
async def list_bible_books(lang: str = Query("en", regex="^(en|pl|es)$")):
    """
    Zwraca listę ksiąg Biblii w wybranym języku
    """
    try:
        books = bible_api.get_books(lang)
        return {"books": books}
    except Exception as e:
        logger.error(f"Error fetching books: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch books")

@router.get("/chapter")
async def get_bible_chapter(
    book: str = Query(..., description="Book ID (e.g., 'John', 'Genesis')"),
    chapter: int = Query(..., ge=1, description="Chapter number"),
    lang: str = Query("en", regex="^(en|pl|es)$")
):
    """
    Pobiera cały rozdział Biblii w wybranym języku
    """
    try:
        chapter_data = await bible_api.get_chapter(book, chapter, lang)
        return chapter_data
    except Exception as e:
        logger.error(f"Error fetching chapter: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch chapter: {str(e)}")

# ========================================
# PRAYER ENDPOINTS
# ========================================

@router.get("/prayers")
async def get_available_prayers(lang: str = Query("en", regex="^(en|pl|es)$")):
    """
    Zwraca listę dostępnych modlitw
    """
    prayers = []
    for prayer_id, prayer_data in CLASSIC_PRAYERS.items():
        if isinstance(prayer_data["title"], dict):
            title = prayer_data["title"].get(lang, prayer_data["title"]["en"])
        else:
            title = prayer_data["title"]
        
        prayers.append({
            "id": prayer_id,
            "title": title,
            "reference": prayer_data["reference"]
        })
    
    return {"prayers": prayers}

@router.get("/prayer/{prayer_id}")
async def get_prayer_by_id(prayer_id: str, lang: str = Query("en", regex="^(en|pl|es)$")):
    """
    Zwraca szczegóły modlitwy w wybranym języku
    """
    if prayer_id not in CLASSIC_PRAYERS:
        raise HTTPException(status_code=404, detail="Prayer not found")
    
    prayer_data = CLASSIC_PRAYERS[prayer_id]
    
    if isinstance(prayer_data["title"], dict):
        title = prayer_data["title"].get(lang, prayer_data["title"]["en"])
    else:
        title = prayer_data["title"]
    
    if isinstance(prayer_data["text"], dict):
        text = prayer_data["text"].get(lang, prayer_data["text"]["en"])
    else:
        text = prayer_data["text"]
    
    return {
        "id": prayer_id,
        "title": title,
        "text": text,
        "reference": prayer_data["reference"]
    }
