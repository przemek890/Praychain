from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    MONGO_DB_NAME: str
    MONGODB_URL: str
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    CELO_ENABLED: bool
    CELO_RPC_URL: str
    PRAY_CONTRACT_ADDRESS: str
    CELO_CHAIN_ID: int = 11142220

    TREASURY_PRIVATE_KEY: str
    USER_PRIVATE_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()

VOICE_VERIFICATION_ENABLED = os.getenv("VOICE_VERIFICATION_ENABLED", "false").lower() in ("true", "1", "yes")
VOICE_SERVICE_URL = os.getenv("VOICE_SERVICE_URL", "http://voice-service:8001")
VOICE_SIMILARITY_THRESHOLD = float(os.getenv("VOICE_SIMILARITY_THRESHOLD", "0.85"))

VOICE_SIMILARITY_BONUS_MULTIPLIER = 10
AI_VOICE_DETECTION_THRESHOLD = 0.7

CAPTCHA_ACCURACY_THRESHOLD = 0.75

LOW_TEXT_ACCURACY_THRESHOLD = 0.5
LOW_TEXT_ACCURACY_PENALTY = 20

ACCURACY_POINTS_MULTIPLIER = 50
STABILITY_POINTS_MULTIPLIER = 25
FLUENCY_POINTS_MULTIPLIER = 15
FOCUS_POINTS_MULTIPLIER = 10

HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_API_BASE = "https://router.huggingface.co/hf-inference"
HF_EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"

BIBLE_API_TIMEOUT = 5.0
BIBLE_API_ENABLED = True

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}
MAX_FILE_SIZE = 100 * 1024 * 1024
