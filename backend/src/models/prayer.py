from pydantic import BaseModel
from typing import Dict, Any

class PrayerAnalysisRequest(BaseModel):
    bible_text: str
    captcha_text: str
    user_id: str = "default_user"

class DualAnalysisRequest(BaseModel):
    prayer_transcription_id: str
    captcha_transcription_id: str
    bible_text: str
    captcha_text: str
    user_id: str = "default_user"

class DualAnalysisResponse(BaseModel):
    analysis: Dict[str, Any]
    captcha_passed: bool
    user_id: str
    message: str