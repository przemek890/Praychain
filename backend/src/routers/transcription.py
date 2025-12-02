from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Optional
from datetime import datetime
import uuid
import os
import logging
from faster_whisper import WhisperModel
from pathlib import Path

from src.config import settings
from src.utils.mongodb import get_database
from src.models.transcription import TranscriptionResponse, AudioUploadResponse

router = APIRouter(prefix="/api", tags=["transcription"])
logger = logging.getLogger(__name__)

logger.info("Loading Whisper model...")
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
logger.info("Whisper model loaded on CPU")

@router.post("/transcribe", response_model=AudioUploadResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    audio_type: Optional[str] = Query("prayer", regex="^(prayer|captcha)$"),
    lang: Optional[str] = Query("en", regex="^(en|pl|es)$")
):
    db = get_database()
    
    # Walidacja rozszerzenia
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Walidacja rozmiaru
    contents = await file.read()
    if len(contents) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE / (1024*1024)}MB"
        )
    
    # Zapisz plik
    file_id = str(uuid.uuid4())
    file_path = Path(settings.UPLOAD_DIR) / f"{file_id}{file_ext}"
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    try:
        logger.info(f"Transcribing {audio_type}: {file_path} (lang: {lang})")
        
        if lang == "auto":
            segments, info = whisper_model.transcribe(
                str(file_path), 
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            detected_language = info.language
            logger.info(f"Detected language: {detected_language}")
        else:
            segments, info = whisper_model.transcribe(
                str(file_path), 
                language=lang,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            detected_language = lang
            logger.info(f"Using forced language: {lang}")
        
        text = " ".join([segment.text for segment in segments])
        
        transcription_data = {
            "_id": file_id,
            "text": text.strip(),
            "language": detected_language,
            "duration": info.duration,
            "file_path": str(file_path),
            "audio_type": audio_type,
            "created_at": datetime.utcnow()
        }
        
        await db.transcriptions.insert_one(transcription_data)
        logger.info(f"Transcription saved with ID: {file_id} ({audio_type}, lang: {detected_language})")
        
        return AudioUploadResponse(
            transcription=TranscriptionResponse(
                id=file_id,
                text=transcription_data["text"],
                language=transcription_data["language"],
                duration=transcription_data["duration"],
                file_path=str(file_path),
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
        file_path=transcription.get("file_path"),
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
                file_path=t.get("file_path"),
                created_at=t["created_at"]
            )
            for t in transcriptions
        ]
    }

@router.post("/change-model")
async def change_whisper_model(model_name: str):
    global whisper_model
    
    valid_models = ["tiny", "base", "small", "medium", "large-v2"]
    if model_name not in valid_models:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model. Choose from: {', '.join(valid_models)}"
        )
    
    try:
        logger.info(f"Loading new Whisper model: {model_name}")
        whisper_model = WhisperModel(model_name, device="cpu", compute_type="int8")
        return {"message": f"Model changed to: {model_name}", "device": "cpu"}
    except Exception as e:
        logger.error(f"Error changing model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
