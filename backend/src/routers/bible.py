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
    try:
        day_of_year = datetime.now().timetuple().tm_yday
        total_chapters = sum(CHAPTERS_PER_BOOK.values())
        chapter_index = day_of_year % total_chapters
        cumulative = 0
        selected_book = "Genesis"
        selected_chapter = 1
        
        for book in BIBLE_BOOKS_ORDER:
            book_chapters = CHAPTERS_PER_BOOK[book]
            if cumulative + book_chapters > chapter_index:
                selected_book = book
                selected_chapter = chapter_index - cumulative + 1
                break
            cumulative += book_chapters
        
        url = f"https://bible-api.com/{selected_book} {selected_chapter}"
        response = requests.get(url, timeout=BIBLE_API_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        
        return {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "reference": f"{selected_book} {selected_chapter}",
            "text": data["text"],
            "verses": data.get("verses", []),
            "type": "daily_reading",
            "book": selected_book,
            "chapter": selected_chapter
        }
    except Exception as e:
        logger.error(f"Error fetching daily reading: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching daily reading")

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
    return {
        "total": len(BIBLE_BOOKS_ORDER),
        "books": BIBLE_BOOKS_ORDER,
        "old_testament": BIBLE_BOOKS_ORDER[:39],
        "new_testament": BIBLE_BOOKS_ORDER[39:]
    }
