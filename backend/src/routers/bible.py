from fastapi import APIRouter, HTTPException, Query
import logging
import requests
import random
from datetime import datetime
from ..data.prayers import CLASSIC_PRAYERS
from ..data.quotes import SHORT_BIBLE_QUOTES
from ..data.bible_structure import BIBLE_BOOKS_ORDER, CHAPTERS_PER_BOOK
from src.config import BIBLE_API_TIMEOUT, BIBLE_API_ENABLED

router = APIRouter(prefix="/api/bible", tags=["bible"])
logger = logging.getLogger(__name__)

BASE_URL = "https://bible-api.com"

@router.get("/random-quote")
async def get_random_bible_quote():
    if not BIBLE_API_ENABLED:
        raise HTTPException(status_code=503, detail="Bible quote service is disabled")
    
    try:
        url = "https://bible-api.com/?random=verse"
        response = requests.get(url, timeout=BIBLE_API_TIMEOUT)
        response.raise_for_status()
        data = response.json()["verses"][0]
        
        return {
            "text": data["text"],
            "reference": f"{data['book_name']} {data['chapter']}:{data['verse']}",
            "book_name": data["book_name"],
            "chapter": data["chapter"],
            "verse": data["verse"],
            "type": "bible_verse"
        }
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail=f"Quote was not downloaded in the requested {BIBLE_API_TIMEOUT} seconds"
        )
    except Exception as e:
        logger.error(f"Error fetching Bible quote: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching Bible quote")

@router.get("/short-quote")
async def get_short_quote():
    quote = random.choice(SHORT_BIBLE_QUOTES)
    return {
        "text": quote["text"],
        "reference": quote["reference"],
        "category": quote["category"],
        "type": "short_quote"
    }

@router.get("/prayer/{prayer_type}")
async def get_prayer(prayer_type: str):
    if prayer_type not in CLASSIC_PRAYERS:
        raise HTTPException(status_code=404, detail="Prayer not found")
    
    return CLASSIC_PRAYERS[prayer_type]

@router.get("/prayers")
async def list_prayers():
    return {
        "total": len(CLASSIC_PRAYERS),
        "prayers": [
            {
                "id": key,
                "title": prayer["title"],
                "reference": prayer["reference"]
            }
            for key, prayer in CLASSIC_PRAYERS.items()
        ]
    }

@router.get("/daily-reading")
async def get_daily_reading():
    """
    Generuje czytanie na dzisiaj na podstawie daty
    """
    try:
        from src.data.bible_structure import BIBLE_BOOKS_ORDER, CHAPTERS_PER_BOOK
        import random
        
        # Use date as seed for consistent daily reading
        today = datetime.now().date()
        seed = int(today.strftime('%Y%m%d'))
        random.seed(seed)
        
        # Select random book and chapter
        book = random.choice(BIBLE_BOOKS_ORDER)
        max_chapter = CHAPTERS_PER_BOOK.get(book, 1)
        chapter = random.randint(1, max_chapter)
        
        # Fetch chapter content
        response = requests.get(
            f"{BASE_URL}/{book}/{chapter}",
            timeout=BIBLE_API_TIMEOUT
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch daily reading")
            
        data = response.json()
        
        # Format response
        verses = []
        for verse in data.get("verses", []):
            verses.append({
                "verse": verse.get("verse"),
                "text": verse.get("text", "")
            })
        
        return {
            "book_name": book,
            "chapter": chapter,
            "verses": verses,
            "date": today.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting daily reading: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/read")
async def read_bible(
    book: str = Query(..., description="Book name (e.g., 'Genesis')"),
    chapter: int = Query(..., ge=1, description="Chapter number"),
    verses: str = Query(None, description="Verse range (e.g., '1-5' or '16')")
):
    try:
        if verses:
            reference = f"{book} {chapter}:{verses}"
        else:
            reference = f"{book} {chapter}"
        
        url = f"https://bible-api.com/{reference}"
        response = requests.get(url, timeout=BIBLE_API_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        
        return {
            "reference": reference,
            "text": data["text"],
            "verses": data.get("verses", []),
            "book": book,
            "chapter": chapter
        }
    except Exception as e:
        logger.error(f"Error reading Bible: {str(e)}")
        raise HTTPException(status_code=500, detail="Error reading Bible passage")

@router.get("/verse/{reference}")
async def get_bible_verse(reference: str):
    try:
        url = f"https://bible-api.com/{reference}"
        response = requests.get(url, timeout=BIBLE_API_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        
        return {
            "text": data["text"],
            "reference": data["reference"],
            "verses": data.get("verses", [])
        }
    except Exception as e:
        logger.error(f"Error fetching Bible verse: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching Bible verse")

@router.get("/books")
async def list_bible_books():
    """
    Zwraca listę wszystkich książek Biblii z liczbą rozdziałów
    """
    return {
        "total": len(BIBLE_BOOKS_ORDER),
        "books": BIBLE_BOOKS_ORDER,
        "old_testament": BIBLE_BOOKS_ORDER[:39],
        "new_testament": BIBLE_BOOKS_ORDER[39:],
        "chapters_per_book": CHAPTERS_PER_BOOK
    }

@router.get("/chapter")
async def get_bible_chapter(
    book: str = Query(..., description="Book name (e.g., 'Genesis')"),
    chapter: int = Query(..., ge=1, description="Chapter number")
):
    """
    Pobiera cały rozdział z Biblii
    """
    try:
        if book not in BIBLE_BOOKS_ORDER:
            raise HTTPException(status_code=400, detail=f"Invalid book name: {book}")
        
        max_chapter = CHAPTERS_PER_BOOK.get(book, 1)
        if chapter > max_chapter:
            raise HTTPException(
                status_code=400, 
                detail=f"Chapter {chapter} doesn't exist in {book} (max: {max_chapter})"
            )
        
        url = f"{BASE_URL}/{book} {chapter}"
        response = requests.get(url, timeout=BIBLE_API_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        
        verses = []
        for verse in data.get("verses", []):
            verses.append({
                "verse": verse.get("verse"),
                "text": verse.get("text", "").strip()
            })
        
        return {
            "book_name": book,
            "chapter": chapter,
            "verses": verses,
            "reference": f"{book} {chapter}"
        }
        
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail=f"Bible API timeout after {BIBLE_API_TIMEOUT} seconds"
        )
    except Exception as e:
        logger.error(f"Error fetching chapter: {e}")
        raise HTTPException(status_code=500, detail=str(e))
