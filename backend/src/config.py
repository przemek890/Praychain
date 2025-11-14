from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    MONGO_DB_NAME: str
    MONGODB_URL: str
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    CELO_RPC_URL: str
    PRAY_CONTRACT_ADDRESS: str
    CELO_CHAIN_ID: int = 11142220

    TREASURY_PRIVATE_KEY: str
    USER_PRIVATE_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()

"""
Application configuration
"""
import os

# CAPTCHA accuracy threshold (0.0 - 1.0)
CAPTCHA_ACCURACY_THRESHOLD = 0.5

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
