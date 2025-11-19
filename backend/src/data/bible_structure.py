"""
Struktura Biblii - kolejność książek i liczba rozdziałów
"""

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

# Polskie nazwy książek Biblii
BIBLE_BOOKS_ORDER_PL = [
    # Stary Testament
    "Rodzaju", "Wyjścia", "Kapłańska", "Liczb", "Powtórzonego Prawa",
    "Jozuego", "Sędziów", "Rut", "1 Samuela", "2 Samuela",
    "1 Królewska", "2 Królewska", "1 Kronik", "2 Kronik",
    "Ezdrasza", "Nehemiasza", "Estery", "Hioba", "Psalmów", "Przysłów",
    "Kaznodziei Salomona", "Pieśń nad Pieśniami", "Izajasza", "Jeremiasza",
    "Lamentacje Jeremiasza", "Ezechiela", "Daniela", "Ozeasza", "Joela",
    "Amosa", "Abdiasza", "Jonasza", "Micheasza", "Nahuma", "Habakuka",
    "Sofoniasza", "Aggeusza", "Zachariasza", "Malachiasza",
    # Nowy Testament
    "Mateusza", "Marka", "Łukasza", "Jana", "Dzieje Apostolskie", "Rzymian",
    "1 Koryntian", "2 Koryntian", "Galacjan", "Efezjan",
    "Filipian", "Kolosan", "1 Tesaloniczan", "2 Tesaloniczan",
    "1 Tymoteusza", "2 Tymoteusza", "Tytusa", "Filemona", "Hebrajczyków",
    "Jakuba", "1 Piotra", "2 Piotra", "1 Jana", "2 Jana", "3 Jana",
    "Judy", "Objawienie Jana"
]

# Hiszpańskie nazwy książek Biblii
BIBLE_BOOKS_ORDER_ES = [
    # Antiguo Testamento
    "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio",
    "Josué", "Jueces", "Rut", "1 Samuel", "2 Samuel",
    "1 Reyes", "2 Reyes", "1 Crónicas", "2 Crónicas",
    "Esdras", "Nehemías", "Ester", "Job", "Salmos", "Proverbios",
    "Eclesiastés", "Cantares", "Isaías", "Jeremías",
    "Lamentaciones", "Ezequiel", "Daniel", "Oseas", "Joel",
    "Amós", "Abdías", "Jonás", "Miqueas", "Nahúm", "Habacuc",
    "Sofonías", "Hageo", "Zacarías", "Malaquías",
    # Nuevo Testamento
    "Mateo", "Marcos", "Lucas", "Juan", "Hechos", "Romanos",
    "1 Corintios", "2 Corintios", "Gálatas", "Efesios",
    "Filipenses", "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses",
    "1 Timoteo", "2 Timoteo", "Tito", "Filemón", "Hebreos",
    "Santiago", "1 Pedro", "2 Pedro", "1 Juan", "2 Juan", "3 Juan",
    "Judas", "Apocalipsis"
]

# Przybliżona liczba rozdziałów w każdej książce (po angielsku, polsku i hiszpańsku)
CHAPTERS_PER_BOOK = {
    # Angielskie nazwy
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
    "Jude": 1, "Revelation": 22,

    # Polskie nazwy
    "Rodzaju": 50, "Wyjścia": 40, "Kapłańska": 27, "Liczb": 36, "Powtórzonego Prawa": 34,
    "Jozuego": 24, "Sędziów": 21, "Rut": 4, "1 Samuela": 31, "2 Samuela": 24,
    "1 Królewska": 22, "2 Królewska": 25, "1 Kronik": 29, "2 Kronik": 36,
    "Ezdrasza": 10, "Nehemiasza": 13, "Estery": 10, "Hioba": 42, "Psalmów": 150, "Przysłów": 31,
    "Kaznodziei Salomona": 12, "Pieśń nad Pieśniami": 8, "Izajasza": 66, "Jeremiasza": 52,
    "Lamentacje Jeremiasza": 5, "Ezechiela": 48, "Daniela": 12, "Ozeasza": 14, "Joela": 3,
    "Amosa": 9, "Abdiasza": 1, "Jonasza": 4, "Micheasza": 7, "Nahuma": 3, "Habakuka": 3,
    "Sofoniasza": 3, "Aggeusza": 2, "Zachariasza": 14, "Malachiasza": 4,
    "Mateusza": 28, "Marka": 16, "Łukasza": 24, "Jana": 21, "Dzieje Apostolskie": 28, "Rzymian": 16,
    "1 Koryntian": 16, "2 Koryntian": 13, "Galacjan": 6, "Efezjan": 6,
    "Filipian": 4, "Kolosan": 4, "1 Tesaloniczan": 5, "2 Tesaloniczan": 3,
    "1 Tymoteusza": 6, "2 Tymoteusza": 4, "Tytusa": 3, "Filemona": 1, "Hebrajczyków": 13,
    "Jakuba": 5, "1 Piotra": 5, "2 Piotra": 3, "1 Jana": 5, "2 Jana": 1, "3 Jana": 1,
    "Judy": 1, "Objawienie Jana": 22,

    # Hiszpańskie nazwy
    "Génesis": 50, "Éxodo": 40, "Levítico": 27, "Números": 36, "Deuteronomio": 34,
    "Josué": 24, "Jueces": 21, "Rut": 4, "1 Samuel": 31, "2 Samuel": 24,
    "1 Reyes": 22, "2 Reyes": 25, "1 Crónicas": 29, "2 Crónicas": 36,
    "Esdras": 10, "Nehemías": 13, "Ester": 10, "Job": 42, "Salmos": 150, "Proverbios": 31,
    "Eclesiastés": 12, "Cantares": 8, "Isaías": 66, "Jeremías": 52,
    "Lamentaciones": 5, "Ezequiel": 48, "Daniel": 12, "Oseas": 14, "Joel": 3,
    "Amós": 9, "Abdías": 1, "Jonás": 4, "Miqueas": 7, "Nahúm": 3, "Habacuc": 3,
    "Sofonías": 3, "Hageo": 2, "Zacarías": 14, "Malaquías": 4,
    "Mateo": 28, "Marcos": 16, "Lucas": 24, "Juan": 21, "Hechos": 28, "Romanos": 16,
    "1 Corintios": 16, "2 Corintios": 13, "Gálatas": 6, "Efesios": 6,
    "Filipenses": 4, "Colosenses": 4, "1 Tesalonicenses": 5, "2 Tesalonicenses": 3,
    "1 Timoteo": 6, "2 Timoteo": 4, "Tito": 3, "Filemón": 1, "Hebreos": 13,
    "Santiago": 5, "1 Pedro": 5, "2 Pedro": 3, "1 Juan": 5, "2 Juan": 1, "3 Juan": 1,
    "Judas": 1, "Apocalipsis": 22
}