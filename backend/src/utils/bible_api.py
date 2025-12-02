import httpx
import random
import logging
import re
from typing import Dict, List
from src.data.bible_structure import BIBLE_BOOKS_ORDER, BIBLE_BOOKS_ORDER_PL, BIBLE_BOOKS_ORDER_ES, CHAPTERS_PER_BOOK

logger = logging.getLogger(__name__)

class BibleAPIClient:
    def __init__(self):
        self.base_urls = {
            "en": "https://bible-api.com",
            "pl": "https://bible-proxy.kikpl899.workers.dev/api",
            "es": "https://biblia.my.to"
        }
        self.pl_bible = "bw"
        self._es_books_cache = None
        logger.info("Using bible-api.com (EN), www.biblia.info.pl (PL), biblia.my.to (ES)")
    
    def _get_polish_book_map(self) -> Dict[str, str]:
        """Mapping of English names to biblia.info.pl API abbreviations"""
        return {
            # Old Testament
            "Genesis": "rdz",
            "Exodus": "wj",
            "Leviticus": "kpl",
            "Numbers": "lb",
            "Deuteronomy": "pwt",
            "Joshua": "joz",
            "Judges": "sdz",
            "Ruth": "rt",
            "1 Samuel": "1sm",
            "2 Samuel": "2sm",
            "1 Kings": "1krl",
            "2 Kings": "2krl",
            "1 Chronicles": "1krn",
            "2 Chronicles": "2krn",
            "Ezra": "ezd",
            "Nehemiah": "ne",
            "Esther": "est",
            "Job": "hi",
            "Psalms": "ps",
            "Proverbs": "prz",
            "Ecclesiastes": "koh",
            "Song of Solomon": "pnp",
            "Isaiah": "iz",
            "Jeremiah": "jr",
            "Lamentations": "lm",
            "Ezekiel": "ez",
            "Daniel": "dn",
            "Hosea": "oz",
            "Joel": "jl",
            "Amos": "am",
            "Obadiah": "ab",
            "Jonah": "jon",
            "Micah": "mi",
            "Nahum": "na",
            "Habakkuk": "ha",
            "Zephaniah": "so",
            "Haggai": "ag",
            "Zechariah": "za",
            "Malachi": "ml",
            # New Testament
            "Matthew": "mt",
            "Mark": "mk",
            "Luke": "lk",
            "John": "j",
            "Acts": "dz",
            "Romans": "rz",
            "1 Corinthians": "1kor",
            "2 Corinthians": "2kor",
            "Galatians": "ga",
            "Ephesians": "ef",
            "Philippians": "flp",
            "Colossians": "kol",
            "1 Thessalonians": "1tes",
            "2 Thessalonians": "2tes",
            "1 Timothy": "1tm",
            "2 Timothy": "2tm",
            "Titus": "tt",
            "Philemon": "flm",
            "Hebrews": "hbr",
            "James": "jk",
            "1 Peter": "1p",
            "2 Peter": "2p",
            "1 John": "1j",
            "2 John": "2j",
            "3 John": "3j",
            "Jude": "jud",
            "Revelation": "ap"
        }
    
    async def _fetch_spanish_books(self) -> List[Dict]:
        if self._es_books_cache is not None:
            return self._es_books_cache
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_urls['es']}/book")
                response.raise_for_status()
                self._es_books_cache = response.json()
                logger.info(f"Cached {len(self._es_books_cache)} Spanish books")
                return self._es_books_cache
        except Exception as e:
            logger.error(f"Error fetching Spanish books: {e}")
            return []
    
    def _find_spanish_book_id(self, english_book: str, es_books: List[Dict]) -> str:
        name_mapping = {
            "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV",
            "Numbers": "NUM", "Deuteronomy": "DEU",
            "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT",
            "1 Samuel": "1SA", "2 Samuel": "2SA",
            "1 Kings": "1KI", "2 Kings": "2KI",
            "1 Chronicles": "1CH", "2 Chronicles": "2CH",
            "Ezra": "EZR", "Nehemiah": "NEH", "Esther": "EST",
            "Job": "JOB", "Psalms": "PSA", "Proverbs": "PRO",
            "Ecclesiastes": "ECC", "Song of Solomon": "SNG",
            "Isaiah": "ISA", "Jeremiah": "JER", "Lamentations": "LAM",
            "Ezekiel": "EZK", "Daniel": "DAN",
            "Hosea": "HOS", "Joel": "JOL", "Amos": "AMO",
            "Obadiah": "OBA", "Jonah": "JON", "Micah": "MIC",
            "Nahum": "NAM", "Habakkuk": "HAB", "Zephaniah": "ZEP",
            "Haggai": "HAG", "Zechariah": "ZEC", "Malachi": "MAL",
            "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN",
            "Acts": "ACT", "Romans": "ROM",
            "1 Corinthians": "1CO", "2 Corinthians": "2CO",
            "Galatians": "GAL", "Ephesians": "EPH",
            "Philippians": "PHP", "Colossians": "COL",
            "1 Thessalonians": "1TH", "2 Thessalonians": "2TH",
            "1 Timothy": "1TI", "2 Timothy": "2TI",
            "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB",
            "James": "JAS", "1 Peter": "1PE", "2 Peter": "2PE",
            "1 John": "1JN", "2 John": "2JN", "3 John": "3JN",
            "Jude": "JUD", "Revelation": "REV"
        }
        
        return name_mapping.get(english_book, "GEN")
    
    async def get_random_verse(self, lang: str = "en") -> Dict:
        """Get random verse - throws exception on error"""
        if lang == "pl":
            safe_books_en = ["Genesis", "Exodus", "Psalms", "Proverbs", "Matthew", "John", "Romans"]
            english_book = random.choice(safe_books_en)
            
            max_chapter = CHAPTERS_PER_BOOK.get(english_book, 1)
            chapter_num = random.randint(1, min(max_chapter, 25))
            
            chapter_data = await self.get_chapter(english_book, chapter_num, "pl")
            
            if not chapter_data or not chapter_data.get("verses"):
                raise Exception(f"No verses found for {english_book} {chapter_num}")
            
            verse = random.choice(chapter_data["verses"])
            return {
                "text": verse["text"],
                "reference": f"{chapter_data['book_name']} {chapter_num}:{verse['verse']}",
                "book_name": chapter_data['book_name'],
                "chapter": chapter_num,
                "verse": int(verse["verse"]) if str(verse["verse"]).isdigit() else verse["verse"],
                "type": "bible_verse"
            }
        
        elif lang == "es":
            async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
                es_books = await self._fetch_spanish_books()
                if not es_books:
                    raise Exception("No Spanish books available")
                
                valid_books = [b for b in es_books if b["id"] != "intro"]
                book = random.choice(valid_books)
                
                chapters_response = await client.get(f"{self.base_urls['es']}/book/{book['id'].lower()}/chapter")
                chapters_response.raise_for_status()
                chapters = chapters_response.json()
                
                valid_chapters = [c for c in chapters if str(c["number"]).isdigit()]
                if not valid_chapters:
                    raise Exception(f"No valid chapters for book {book['name']}")
                
                chapter = random.choice(valid_chapters)
                chapter_num = int(chapter["number"])
                
                chapter_data = await self.get_chapter(book["id"], chapter_num, "es")
                
                if not chapter_data or not chapter_data.get("verses"):
                    raise Exception(f"No verses found for {book['name']} {chapter_num}")
                
                verse = random.choice(chapter_data["verses"])
                return {
                    "text": verse["text"],
                    "reference": f"{book['name']} {chapter_num}:{verse['verse']}",
                    "book_name": book["name"],
                    "chapter": chapter_num,
                    "verse": int(verse["verse"]) if str(verse["verse"]).isdigit() else verse["verse"],
                    "type": "bible_verse"
                }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_urls['en']}/?random=verse",
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get("text"):
                raise Exception("No verse text in API response")
            
            return {
                "text": data["text"].strip(),
                "reference": data["reference"],
                "book_name": data.get("book_name", ""),
                "chapter": data["verses"][0].get("chapter", 0) if data.get("verses") else 0,
                "verse": data["verses"][0].get("verse", 0) if data.get("verses") else 0,
                "type": "bible_verse"
            }
    
    async def get_chapter(self, book_id: str, chapter_num: int, lang: str = "en") -> Dict:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            if lang == "pl":
                book_map = self._get_polish_book_map()
                pl_book = book_map.get(book_id, book_id.lower())
                
                url = f"{self.base_urls['pl']}/biblia/{self.pl_bible}/{pl_book}/{chapter_num}"
                logger.info(f"Fetching PL chapter: {url} (book_id={book_id} -> {pl_book})")
                
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                verses = []
                for v in data.get("verses", []):
                    verses.append({
                        "verse": str(v.get("verse", "")),
                        "text": v.get("text", "").strip()
                    })
                
                books = self.get_books("pl")
                book_name = next((b["name"] for b in books if b["id"] == book_id), book_id)
                
                return {
                    "book_name": book_name,
                    "chapter": chapter_num,
                    "verses": verses,
                    "reference": f"{book_name} {chapter_num}"
                }
            
            elif lang == "es":
                es_books = await self._fetch_spanish_books()
                es_book_id = self._find_spanish_book_id(book_id, es_books)
                
                verses_list_url = f"{self.base_urls['es']}/book/{es_book_id.lower()}/chapter/{chapter_num}/verse"
                logger.info(f"Fetching ES verses list: {verses_list_url}")
                
                list_response = await client.get(verses_list_url)
                list_response.raise_for_status()
                verses_list = list_response.json()
                
                if not verses_list:
                    raise Exception(f"No verses found for {es_book_id} chapter {chapter_num}")
                
                first_verse = verses_list[0]["number"]
                last_verse = verses_list[-1]["number"]
                verse_range = f"{first_verse}-{last_verse}"
                
                url = f"{self.base_urls['es']}/book/{es_book_id.lower()}/chapter/{chapter_num}/verse/{verse_range}"
                logger.info(f"Fetching ES chapter with range: {url}")
                
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                verses = []
                for v in data:
                    verse_num = str(v.get("number", ""))
                    content = v.get("content", "")
                    text = re.sub(r'^\[\d+\]\s*', '', content)
                    
                    verses.append({
                        "verse": verse_num,
                        "text": text.strip()
                    })
                
                book_name = next((b["name"] for b in es_books if b["id"] == es_book_id), book_id)
                
                logger.info(f"Fetched {len(verses)} verses for {book_name} {chapter_num}")
                
                return {
                    "book_name": book_name,
                    "chapter": chapter_num,
                    "verses": verses,
                    "reference": f"{book_name} {chapter_num}"
                }
            
            reference = f"{book_id} {chapter_num}"
            response = await client.get(f"{self.base_urls['en']}/{reference}")
            response.raise_for_status()
            data = response.json()
            
            verses = [
                {
                    "verse": str(v["verse"]),
                    "text": v["text"].strip()
                }
                for v in data.get("verses", [])
            ]
            
            return {
                "book_name": book_id,
                "chapter": chapter_num,
                "verses": verses,
                "reference": data.get("reference", f"{book_id} {chapter_num}")
            }
    
    def get_books(self, lang: str = "en") -> List[Dict]:
        if lang == "pl":
            books_order = BIBLE_BOOKS_ORDER_PL
        elif lang == "es":
            books_order = BIBLE_BOOKS_ORDER_ES
        else:
            books_order = BIBLE_BOOKS_ORDER
        
        books = []
        for i, book_name in enumerate(books_order):
            english_book = BIBLE_BOOKS_ORDER[i]
            chapters = CHAPTERS_PER_BOOK.get(english_book, 1)
            
            books.append({
                "id": english_book,
                "name": book_name,
                "abbreviation": book_name[:3],
                "chapters": chapters
            })
        
        return books

bible_api = BibleAPIClient()