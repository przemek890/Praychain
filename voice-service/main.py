from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from resemblyzer import VoiceEncoder, preprocess_wav
from pathlib import Path
import numpy as np
import logging
import os
import tempfile
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Voice Verification Service")

# Load Resemblyzer encoder (CPU-friendly)
logger.info("Loading Resemblyzer voice encoder...")
try:
    encoder = VoiceEncoder()
    logger.info("Resemblyzer encoder loaded successfully (CPU mode)")
except Exception as e:
    logger.error(f"Failed to load encoder: {e}")
    encoder = None

class VoiceComparisonResponse(BaseModel):
    similarity_score: float
    is_same_speaker: bool
    confidence: float

def compute_similarity(wav1_path: str, wav2_path: str) -> float:
    """
    Compute cosine similarity between two voice embeddings
    """
    if encoder is None:
        raise Exception("Encoder not loaded")
    
    # Preprocess audio files
    wav1 = preprocess_wav(Path(wav1_path))
    wav2 = preprocess_wav(Path(wav2_path))
    
    # Generate embeddings
    embed1 = encoder.embed_utterance(wav1)
    embed2 = encoder.embed_utterance(wav2)
    
    # Compute cosine similarity
    similarity = np.dot(embed1, embed2) / (np.linalg.norm(embed1) * np.linalg.norm(embed2))
    
    return float(similarity)

@app.post("/verify", response_model=VoiceComparisonResponse)
async def verify_voice(
    audio_file_1: UploadFile = File(...),
    audio_file_2: UploadFile = File(...),
    threshold: float = Form(0.75)
):
    temp_dir = None
    try:
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        
        # Save uploaded files
        file1_path = os.path.join(temp_dir, "audio1.wav")
        file2_path = os.path.join(temp_dir, "audio2.wav")
        
        with open(file1_path, "wb") as f:
            shutil.copyfileobj(audio_file_1.file, f)
        
        with open(file2_path, "wb") as f:
            shutil.copyfileobj(audio_file_2.file, f)
        
        logger.info(f"Comparing uploaded audio files")
        
        # Compute similarity
        similarity_score = compute_similarity(file1_path, file2_path)
        
        is_same_speaker = similarity_score >= threshold
        confidence = abs(similarity_score - threshold)
        
        logger.info(
            f"Similarity: {similarity_score:.4f}, "
            f"Same speaker: {is_same_speaker}, "
            f"Confidence: {confidence:.4f}"
        )
        
        return VoiceComparisonResponse(
            similarity_score=round(similarity_score, 4),
            is_same_speaker=is_same_speaker,
            confidence=round(confidence, 4)
        )
        
    except Exception as e:
        logger.error(f"Voice verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy" if encoder else "unhealthy",
        "model": "Resemblyzer (GE2E)",
        "device": "CPU"
    }