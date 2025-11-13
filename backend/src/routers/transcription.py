from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from datetime import datetime
import uuid
import os
import logging
import whisper
import torch

from src.config.settings import (
    UPLOAD_DIR,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE
)
from src.utils.mongodb import get_database
from src.models.transcription import TranscriptionResponse, AudioUploadResponse

router = APIRouter(prefix="/api", tags=["transcription"])
logger = logging.getLogger(__name__)

logger.info("Loading Whisper model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
whisper_model = whisper.load_model("base", device=device)
logger.info(f"Whisper model loaded on {device}")

@router.post("/transcribe", response_model=AudioUploadResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    audio_type: str = "prayer"
):
    db = get_database()
    
    try:
        file_ext = os.path.splitext(file.filename or "")[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        transcription_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{transcription_id}{file_ext}")
        
        with open(file_path, "wb") as f:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                os.remove(file_path)
                raise HTTPException(status_code=400, detail="File too large (max 100MB)")
            f.write(content)
        
        logger.info(f"Transcribing {audio_type}: {file_path}")
        result = whisper_model.transcribe(file_path, language="en")
        
        transcription_data = {
            "_id": transcription_id,
            "text": result["text"].strip(),
            "language": result.get("language", "en"),
            "duration": result.get("duration", 0.0),
            "file_path": file_path,
            "audio_type": audio_type,
            "created_at": datetime.utcnow()
        }
        
        await db.transcriptions.insert_one(transcription_data)
        logger.info(f"Transcription saved with ID: {transcription_id} ({audio_type})")
        
        return AudioUploadResponse(
            transcription=TranscriptionResponse(
                id=transcription_id,
                text=transcription_data["text"],
                language=transcription_data["language"],
                duration=transcription_data["duration"],
                file_path=file_path,
                created_at=transcription_data["created_at"]
            ),
            message=f"{audio_type.capitalize()} transcribed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

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
