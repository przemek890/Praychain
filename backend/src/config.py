from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    """Centralna konfiguracja aplikacji"""
    
    # MongoDB
    MONGODB_URL: str
    MONGO_DB_NAME: str = "praychain"
    
    # Backend
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    
    # Hugging Face API
    HF_API_KEY: str
    HF_API_BASE: str = "https://api-inference.huggingface.co/models"
    HF_EMOTION_MODEL: str = "j-hartmann/emotion-english-distilroberta-base"
    
    # Celo Blockchain
    CELO_ENABLED: bool = False
    CELO_RPC_URL: Optional[str] = None
    CELO_CHAIN_ID: int = 44787
    PRAY_CONTRACT_ADDRESS: Optional[str] = None
    TREASURY_PRIVATE_KEY: Optional[str] = None
    USER_PRIVATE_KEY: Optional[str] = None
    
    # Voice Verification
    VOICE_VERIFICATION_ENABLED: bool = False
    VOICE_SERVICE_URL: str = "http://voice-service:8001"
    VOICE_SIMILARITY_THRESHOLD: float = 0.85
    VOICE_SIMILARITY_BONUS_MULTIPLIER: int = 10
    AI_VOICE_DETECTION_THRESHOLD: float = 0.7
    
    # CAPTCHA
    CAPTCHA_ACCURACY_THRESHOLD: float = 0.75
    
    # Scoring System
    LOW_TEXT_ACCURACY_THRESHOLD: float = 0.5
    LOW_TEXT_ACCURACY_PENALTY: int = 20
    ACCURACY_POINTS_MULTIPLIER: int = 50
    STABILITY_POINTS_MULTIPLIER: int = 25
    FLUENCY_POINTS_MULTIPLIER: int = 15
    FOCUS_POINTS_MULTIPLIER: int = 10
    
    # Bible API
    BIBLE_API_TIMEOUT: float = 5.0
    BIBLE_API_ENABLED: bool = True
    
    # Upload Settings
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024
    ALLOWED_EXTENSIONS: set = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

settings = Settings()

# Utwórz folder uploadów
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
