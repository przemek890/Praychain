from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from datetime import datetime
import whisper
import torch
import os
import uuid
import logging

from src.config import settings
from src.utils.mongodb import get_database
from src.models.transcription import TranscriptionResponse, AudioUploadResponse

router = APIRouter(prefix="/api", tags=["transcription"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# tiny - fastest, least accurate
# base - good balance (default)
# small - better, but slower
# medium/large - best, but very slow
logger.info("Loading Whisper model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
whisper_model = whisper.load_model("base", device=device)
logger.info(f"Whisper model loaded on {device}")

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = None
):
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    file_id = str(uuid.uuid4())
    temp_file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
    
    try:
        content = await file.read()
        
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"The file is too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        with open(temp_file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"Processing audio file: {file.filename} ({len(content)} bytes)")
        
        transcribe_options = {
            "language": language,
            "task": "transcribe",
            "verbose": False
        }
        
        if language is None:
            transcribe_options.pop("language")
        
        result = whisper_model.transcribe(temp_file_path, **transcribe_options)
        
        transcription_data = {
            "_id": file_id,
            "text": result["text"].strip(),
            "language": result.get("language", language),
            "duration": None,
            "original_filename": file.filename,
            "created_at": datetime.utcnow(),
            "segments": len(result.get("segments", [])),
        }
        
        db = get_database()
        await db.transcriptions.insert_one(transcription_data)
        
        logger.info(f"Transcription saved with ID: {file_id}")
        
        return TranscriptionResponse(
            id=file_id,
            text=result["text"].strip(),
            language=transcription_data["language"],
            duration=transcription_data["duration"],
            created_at=transcription_data["created_at"]
        )
        
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during transcription: {str(e)}")
    
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@router.get("/transcriptions/{transcription_id}", response_model=TranscriptionResponse)
async def get_transcription(transcription_id: str):
    db = get_database()
    transcription = await db.transcriptions.find_one({"_id": transcription_id})
    
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    return TranscriptionResponse(
        id=transcription["_id"],
        text=transcription["text"],
        language=transcription.get("language"),
        duration=transcription.get("duration"),
        created_at=transcription["created_at"]
    )

@router.get("/transcriptions")
async def list_transcriptions(skip: int = 0, limit: int = 10):
    db = get_database()
    transcriptions = await db.transcriptions.find().skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "total": await db.transcriptions.count_documents({}),
        "transcriptions": [
            TranscriptionResponse(
                id=t["_id"],
                text=t["text"],
                language=t.get("language"),
                duration=t.get("duration"),
                created_at=t["created_at"]
            )
            for t in transcriptions
        ]
    }

@router.post("/change-model")
async def change_whisper_model(model_name: str):
    global whisper_model
    
    valid_models = ["tiny", "base", "small", "medium", "large"]
    if model_name not in valid_models:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model. Choose from: {', '.join(valid_models)}"
        )
    
    try:
        logger.info(f"Loading new Whisper model: {model_name}")
        whisper_model = whisper.load_model(model_name, device=device)
        return {"message": f"Model changed to: {model_name}", "device": device}
    except Exception as e:
        logger.error(f"Error changing model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
