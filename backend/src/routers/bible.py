from fastapi import APIRouter, HTTPException, Query
import logging
import requests
import random
from datetime import datetime

router = APIRouter(prefix="/api/bible", tags=["bible"])
logger = logging.getLogger(__name__)

BIBLE_API_TIMEOUT = 5.0
BIBLE_API_ENABLED = True

# ✅ DODANE: Klasyczne modlitwy chrześcijańskie
CLASSIC_PRAYERS = {
    "our_father": {
        "title": "Our Father (The Lord's Prayer)",
        "text": "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.",
        "reference": "Matthew 6:9-13",
        "language": "English"
    },
    "hail_mary": {
        "title": "Hail Mary",
        "text": "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.",
        "reference": "Luke 1:28, 1:42",
        "language": "English"
    },
    "glory_be": {
        "title": "Glory Be",
        "text": "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen.",
        "reference": "Traditional",
        "language": "English"
    },
    "apostles_creed": {
        "title": "Apostles' Creed",
        "text": "I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; he descended into hell; on the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God the Father almighty; from there he will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.",
        "reference": "Traditional",
        "language": "English"
    }
}

# ✅ DODANE: Krótkie, inspirujące cytaty biblijne (łatwe do zapamiętania)
SHORT_BIBLE_QUOTES = [
    {"text": "Be still, and know that I am God.", "reference": "Psalm 46:10", "category": "peace"},
    {"text": "I can do all things through Christ who strengthens me.", "reference": "Philippians 4:13", "category": "strength"},
    {"text": "The Lord is my shepherd; I shall not want.", "reference": "Psalm 23:1", "category": "comfort"},
    {"text": "For God so loved the world that he gave his one and only Son.", "reference": "John 3:16", "category": "love"},
    {"text": "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", "reference": "Philippians 4:6", "category": "peace"},
    {"text": "Trust in the Lord with all your heart and lean not on your own understanding.", "reference": "Proverbs 3:5", "category": "trust"},
    {"text": "Cast all your anxiety on him because he cares for you.", "reference": "1 Peter 5:7", "category": "comfort"},
    {"text": "The Lord is my light and my salvation—whom shall I fear?", "reference": "Psalm 27:1", "category": "courage"},
    {"text": "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", "reference": "Joshua 1:9", "category": "courage"},
    {"text": "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.", "reference": "1 Corinthians 13:4", "category": "love"},
    {"text": "And now these three remain: faith, hope and love. But the greatest of these is love.", "reference": "1 Corinthians 13:13", "category": "love"},
    {"text": "Come to me, all you who are weary and burdened, and I will give you rest.", "reference": "Matthew 11:28", "category": "rest"},
    {"text": "This is the day the Lord has made; let us rejoice and be glad in it.", "reference": "Psalm 118:24", "category": "joy"},
    {"text": "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.", "reference": "Numbers 6:24-25", "category": "blessing"},
    {"text": "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", "reference": "Jeremiah 29:11", "category": "hope"},
]

# Sekwencja książek Biblii (kolejność kanoniczna)
BIBLE_BOOKS_ORDER = [
    # Stary Testament
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
    "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
    "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
    "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
    "Zephaniah", "Haggai", "Zechariah", "Malachi",
    # Nowy Testament
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
    "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
    "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
    "Jude", "Revelation"
]

# Przybliżona liczba rozdziałów w każdej książce
CHAPTERS_PER_BOOK = {
    "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
    "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24,
    "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36,
    "Ezra": 10, "Nehemiah": 13, "Esther": 10, "Job": 42, "Psalms": 150, "Proverbs": 31,
    "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66, "Jeremiah": 52,
    "Lamentations": 5, "Ezekiel": 48, "Daniel": 12, "Hosea": 14, "Joel": 3,
    "Amos": 9, "Obadiah": 1, "Jonah": 4, "Micah": 7, "Nahum": 3, "Habakkuk": 3,
    "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 4,
    "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28, "Romans": 16,
    "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6, "Ephesians": 6,
    "Philippians": 4, "Colossians": 4, "1 Thessalonians": 5, "2 Thessalonians": 3,
    "1 Timothy": 6, "2 Timothy": 4, "Titus": 3, "Philemon": 1, "Hebrews": 13,
    "James": 5, "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1,
    "Jude": 1, "Revelation": 22
}

@router.get("/random-quote")
async def get_random_bible_quote():
    """Losowy werset z Biblii (długi fragment z API)"""
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
    """
    ✅ NOWE: Krótki, inspirujący cytat biblijny
    Idealny do codziennego czytania i łatwego zapamiętania
    """
    quote = random.choice(SHORT_BIBLE_QUOTES)
    return {
        "text": quote["text"],
        "reference": quote["reference"],
        "category": quote["category"],
        "type": "short_quote"
    }

@router.get("/prayer/{prayer_name}")
async def get_prayer(prayer_name: str):
    """
    ✅ NOWE: Pobierz klasyczną modlitwę chrześcijańską
    
    Dostępne modlitwy:
    - our_father: Ojcze Nasz (The Lord's Prayer)
    - hail_mary: Zdrowaś Mario
    - glory_be: Chwała Ojcu
    - apostles_creed: Skład Apostolski
    """
    prayer = CLASSIC_PRAYERS.get(prayer_name.lower())
    
    if not prayer:
        raise HTTPException(
            status_code=404,
            detail=f"Prayer not found. Available: {', '.join(CLASSIC_PRAYERS.keys())}"
        )
    
    return {
        **prayer,
        "type": "prayer"
    }

@router.get("/prayers")
async def list_prayers():
    """✅ NOWE: Lista wszystkich dostępnych modlitw"""
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
    Czytanie dnia - rotuje się codziennie przez całą Biblię
    """
    try:
        day_of_year = datetime.now().timetuple().tm_yday
        
        # Oblicz, który rozdział Biblii czytamy dziś
        total_chapters = sum(CHAPTERS_PER_BOOK.values())
        chapter_index = day_of_year % total_chapters
        
        # Znajdź odpowiednią książkę i rozdział
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
    """Czytaj Biblię - konkretny fragment"""
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
    """Pobierz konkretny werset"""
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
    """Lista wszystkich książek Biblii"""
    return {
        "total": len(BIBLE_BOOKS_ORDER),
        "books": BIBLE_BOOKS_ORDER,
        "old_testament": BIBLE_BOOKS_ORDER[:39],
        "new_testament": BIBLE_BOOKS_ORDER[39:]
    }