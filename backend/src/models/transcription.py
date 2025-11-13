from pydantic import BaseModel
from datetime import datetime

class TranscriptionResponse(BaseModel):
    id: str
    text: str
    language: str
    duration: float
    created_at: datetime
    file_path: str

class AudioUploadResponse(BaseModel):
    transcription: TranscriptionResponse
    message: str