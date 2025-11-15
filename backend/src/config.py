from pydantic_settings import BaseSettings
from dotenv import load_dotenv

import os

load_dotenv()

class Settings(BaseSettings):
    MONGO_DB_NAME: str
    MONGODB_URL: str
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()

# CAPTCHA accuracy threshold (0.0 - 1.0)
CAPTCHA_ACCURACY_THRESHOLD = 0.75

# Text accuracy threshold for low tokens
LOW_TEXT_ACCURACY_THRESHOLD = 0.3
LOW_TEXT_ACCURACY_PENALTY = 20

# Point multipliers for different metrics
ACCURACY_POINTS_MULTIPLIER = 50
STABILITY_POINTS_MULTIPLIER = 25
FLUENCY_POINTS_MULTIPLIER = 15
FOCUS_POINTS_MULTIPLIER = 10

# File upload settings
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed audio file extensions
ALLOWED_EXTENSIONS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}

# Maximum file size: 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024

BIBLE_API_TIMEOUT = 5.0
BIBLE_API_ENABLED = True

# Voice verification settings
VOICE_VERIFICATION_ENABLED = True
ASSEMBLYAI_MIN_SIMILARITY = 0.65

# Delay między dwoma wywołaniami detektora (bezpieczny bufor)
REPLICATE_DELAY_SECONDS = int(os.getenv("VOICE_DETECT_DELAY_SECONDS", "8"))

# Resemble Detect
RESEMBLE_API_TOKEN = os.getenv("RESEMBLE_API_TOKEN", "")
RESEMBLE_DETECT_URL = os.getenv("RESEMBLE_DETECT_URL", "https://api.resemble.ai/v1/detect")