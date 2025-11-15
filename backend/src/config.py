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

# ============================================
# CAPTCHA VERIFICATION SETTINGS
# ============================================
# Minimum accuracy threshold for CAPTCHA to pass (0.0 - 1.0)
CAPTCHA_ACCURACY_THRESHOLD = 0.75

# ============================================
# TEXT ACCURACY THRESHOLDS & PENALTIES
# ============================================
# Minimum text accuracy before applying penalty (0.0 - 1.0)
LOW_TEXT_ACCURACY_THRESHOLD = 0.5

# Token penalty for poor text accuracy
LOW_TEXT_ACCURACY_PENALTY = 20

# ============================================
# TOKEN CALCULATION MULTIPLIERS
# ============================================
# Multiplier for text accuracy (how well prayer text matches reference)
ACCURACY_POINTS_MULTIPLIER = 50

# Multiplier for emotional stability (calm, focused emotional state)
STABILITY_POINTS_MULTIPLIER = 25

# Multiplier for speech fluency (lack of hesitations)
FLUENCY_POINTS_MULTIPLIER = 15

# Multiplier for overall focus score
FOCUS_POINTS_MULTIPLIER = 10

# ============================================
# VOICE VERIFICATION SETTINGS (Proof-of-Prayer)
# ============================================
# Enable/disable voice biometric verification
VOICE_VERIFICATION_ENABLED = True

# Minimum voice similarity threshold for verification (0.0 - 1.0)
# Compares prayer audio with CAPTCHA audio biometrics
VOICE_SIMILARITY_THRESHOLD = 0.85

# Bonus points multiplier for high voice similarity
VOICE_SIMILARITY_BONUS_MULTIPLIER = 10

# AI/Synthetic voice detection threshold (0.0 - 1.0)
# Lower score = more likely AI-generated
AI_VOICE_DETECTION_THRESHOLD = 0.7

# ============================================
# EXTERNAL API CONFIGURATION
# ============================================
# AssemblyAI - Voice biometric matching
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY", "")
ASSEMBLYAI_UPLOAD_URL = "https://api.assemblyai.com/v2/upload"
ASSEMBLYAI_TRANSCRIPT_URL = "https://api.assemblyai.com/v2/transcript"

# Deepgram - AI/Synthetic voice detection (best in class)
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
DEEPGRAM_API_URL = "https://api.deepgram.com/v1/listen"

# HuggingFace - Emotion Analysis
HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_API_BASE = "https://router.huggingface.co/hf-inference"
HF_EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"

# Bible API configuration
BIBLE_API_TIMEOUT = 5.0
BIBLE_API_ENABLED = True

# ============================================
# FILE UPLOAD SETTINGS
# ============================================
# Directory for storing uploaded audio files
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed audio file formats
ALLOWED_EXTENSIONS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}

# Maximum upload file size: 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024

# ============================================
# AI MODEL SETTINGS
# ============================================
# Whisper model for transcription
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")  # tiny, base, small, medium, large-v2
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"