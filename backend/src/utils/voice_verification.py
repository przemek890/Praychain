import os
import logging
import numpy as np
import torch
from typing import Dict
from pathlib import Path

logger = logging.getLogger(__name__)

# Force CPU only (no GPU)
torch.set_num_threads(1)  # Lighter CPU usage

# ========================================
# SPEECHBRAIN - LIGHTWEIGHT VOICE MATCHING (CPU-only)
# ========================================
try:
    from speechbrain.inference.speaker import SpeakerRecognition
    
    # Load lightweight model (50MB, CPU-optimized)
    verification = SpeakerRecognition.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir="models/speaker_recognition",
        run_opts={"device": "cpu"}  # Force CPU
    )
    logger.info("✅ SpeechBrain speaker recognition loaded (50MB, CPU-only)")
    SPEECHBRAIN_AVAILABLE = True
    
except ImportError:
    logger.warning("⚠️ SpeechBrain not installed. Run: poetry add speechbrain torchaudio")
    SPEECHBRAIN_AVAILABLE = False
    verification = None
except Exception as e:
    logger.error(f"Failed to load SpeechBrain model: {e}")
    SPEECHBRAIN_AVAILABLE = False
    verification = None

def verify_speaker_match_speechbrain(audio_path1: str, audio_path2: str) -> Dict:
    """
    Compare two voice samples using SpeechBrain (CPU-only, 50MB model)
    Returns similarity score between speakers
    """
    if not SPEECHBRAIN_AVAILABLE:
        logger.warning("SpeechBrain not available, skipping voice matching")
        return {
            "match": True,
            "confidence": 1.0,
            "score": 1.0,
            "note": "Voice matching skipped (SpeechBrain not installed)"
        }
    
    try:
        # Verify speakers
        score, prediction = verification.verify_files(audio_path1, audio_path2)
        
        # Score is a tensor, convert to float
        similarity = float(score.item())
        
        # SpeechBrain threshold: >0.25 = same speaker (lower than Resemblyzer)
        match = similarity > 0.25
        
        logger.info(f"🔊 SpeechBrain - Score: {similarity:.3f}, Match: {match}")
        
        return {
            "match": match,
            "confidence": float(similarity),
            "score": float(similarity),
            "model": "SpeechBrain ECAPA (CPU-only, 50MB)"
        }
        
    except Exception as e:
        logger.error(f"SpeechBrain voice matching failed: {e}")
        return {
            "match": True,  # Fail-safe
            "confidence": 0.5,
            "score": 0.5,
            "error": str(e)
        }

# ========================================
# AI VOICE DETECTION (offline, wykrywa Google Translate, Ivona, itp.)
# ========================================
def detect_ai_voice_offline(audio_path: str) -> Dict:
    """
    Detect AI/synthetic voice (Google Translate TTS, Ivona, ElevenLabs, etc.)
    Using acoustic analysis:
    1. Pitch stability - AI voices have unnaturally stable pitch
    2. Spectral flatness - AI voices have flatter frequency spectrum
    3. Zero-crossing rate - AI voices have too regular ZCR
    4. Spectral contrast - AI voices have lower contrast
    """
    try:
        import librosa
        
        # Load audio
        y, sr = librosa.load(audio_path, sr=16000)
        
        # 1. PITCH STABILITY (AI = zbyt stabilna wysokość)
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_values = []
        for t in range(pitches.shape[1]):
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            if pitch > 0:
                pitch_values.append(pitch)
        
        pitch_std = np.std(pitch_values) if len(pitch_values) > 0 else 0
        pitch_score = 1.0 if pitch_std < 20 else 0.0  # AI: pitch_std < 20Hz
        
        # 2. SPECTRAL FLATNESS (AI = płaskie spektrum)
        spectral_flatness = librosa.feature.spectral_flatness(y=y)[0]
        flatness_mean = np.mean(spectral_flatness)
        flatness_score = 1.0 if flatness_mean > 0.15 else 0.0  # AI: flatness > 0.15
        
        # 3. ZERO CROSSING RATE (AI = zbyt regularne)
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        zcr_std = np.std(zcr)
        zcr_score = 1.0 if zcr_std < 0.02 else 0.0  # AI: zcr_std < 0.02
        
        # 4. SPECTRAL CONTRAST (AI = niższy kontrast)
        spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        contrast_mean = np.mean(spectral_contrast)
        contrast_score = 1.0 if contrast_mean < 15 else 0.0  # AI: contrast < 15
        
        # WYNIK: jeśli ≥2/4 wskaźników wykrywają AI → to jest AI!
        ai_indicators = [pitch_score, flatness_score, zcr_score, contrast_score]
        ai_score = sum(ai_indicators) / len(ai_indicators)
        
        is_human = ai_score < 0.5  # < 50% wskaźników AI = człowiek
        
        logger.info(f"🤖 AI Detection (wykrywa Google Translate, Ivona, etc.):")
        logger.info(f"   - Pitch stability: {'AI-like' if pitch_score > 0.5 else 'Human-like'} (std: {pitch_std:.1f}Hz)")
        logger.info(f"   - Spectral flatness: {'AI-like' if flatness_score > 0.5 else 'Human-like'} ({flatness_mean:.3f})")
        logger.info(f"   - ZCR regularity: {'AI-like' if zcr_score > 0.5 else 'Human-like'} (std: {zcr_std:.3f})")
        logger.info(f"   - Spectral contrast: {'AI-like' if contrast_score > 0.5 else 'Human-like'} ({contrast_mean:.1f})")
        logger.info(f"   - 🎯 WYNIK: {'✅ CZŁOWIEK' if is_human else '🚨 AI/TTS'} (AI score: {ai_score:.2f})")
        
        return {
            "is_human": is_human,
            "confidence": 1.0 - ai_score,  # Human confidence
            "ai_score": ai_score,
            "details": {
                "pitch_stability": float(pitch_std),
                "spectral_flatness": float(flatness_mean),
                "zcr_std": float(zcr_std),
                "spectral_contrast": float(contrast_mean)
            },
            "model": "Librosa Acoustic Analysis (offline)"
        }
        
    except ImportError:
        logger.error("❌ librosa not installed - AI detection DISABLED")
        return {
            "is_human": False,  # ❌ FAIL if not available
            "confidence": 0.0,
            "ai_score": 1.0,
            "error": "librosa not installed"
        }
    except Exception as e:
        logger.error(f"❌ AI detection failed: {e}")
        return {
            "is_human": False,  # ❌ FAIL on error
            "confidence": 0.0,
            "ai_score": 1.0,
            "error": str(e)
        }

# ========================================
# RESEMBLYZER - VOICE MATCHING (25MB)
# ========================================
try:
    from resemblyzer import VoiceEncoder, preprocess_wav
    
    voice_encoder = VoiceEncoder()
    logger.info("✅ Resemblyzer loaded (25MB)")
    RESEMBLYZER_AVAILABLE = True
    
except ImportError:
    logger.warning("⚠️ Resemblyzer not installed")
    RESEMBLYZER_AVAILABLE = False
    voice_encoder = None

def verify_speaker_match_resemblyzer(audio_path1: str, audio_path2: str) -> Dict:
    """Compare two voice samples using Resemblyzer"""
    if not RESEMBLYZER_AVAILABLE:
        logger.error("❌ Resemblyzer not available")
        return {
            "match": False,
            "confidence": 0.0,
            "score": 0.0,
            "error": "Resemblyzer not installed"
        }
    
    try:
        wav1_data = preprocess_wav(Path(audio_path1))
        wav2_data = preprocess_wav(Path(audio_path2))
        
        embedding1 = voice_encoder.embed_utterance(wav1_data)
        embedding2 = voice_encoder.embed_utterance(wav2_data)
        
        similarity = np.dot(embedding1, embedding2) / (
            np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
        )
        
        match = similarity >= 0.7
        
        logger.info(f"🔊 Resemblyzer - Similarity: {similarity:.3f}, Match: {match}")
        
        return {
            "match": match,
            "confidence": float(similarity),
            "score": float(similarity),
            "model": "Resemblyzer"
        }
        
    except Exception as e:
        logger.error(f"❌ Resemblyzer failed: {e}")
        return {
            "match": False,
            "confidence": 0.0,
            "score": 0.0,
            "error": str(e)
        }

from src.config import VOICE_SIMILARITY_THRESHOLD
from src.utils.mongodb import get_database

async def verify_recording_session(
    prayer_transcription_id: str,
    captcha_transcription_id: str,
    min_similarity: float = VOICE_SIMILARITY_THRESHOLD
) -> Dict:
    """
    Voice verification (2 steps):
    1. 🤖 AI/TTS detection (wykrywa Google Translate, Ivona, ElevenLabs)
    2. 🔊 Voice matching (porównuje czy ta sama osoba)
    """
    try:
        db = get_database()
        
        prayer_record = await db.transcriptions.find_one({"_id": prayer_transcription_id})
        captcha_record = await db.transcriptions.find_one({"_id": captcha_transcription_id})
        
        if not prayer_record or not captcha_record:
            logger.error("❌ Transcription records not found")
            return {
                "passed": False,
                "voice_match": False,
                "similarity_score": 0.0,
                "is_human": False,
                "human_confidence": 0.0,
                "details": {"failure_reasons": ["Transcription records not found"]}
            }
        
        prayer_audio_path = prayer_record.get("file_path")
        captcha_audio_path = captcha_record.get("file_path")
        
        if not prayer_audio_path or not captcha_audio_path:
            logger.error("❌ Audio files not found")
            return {
                "passed": False,
                "voice_match": False,
                "similarity_score": 0.0,
                "is_human": False,
                "human_confidence": 0.0,
                "details": {"failure_reasons": ["Audio files not found"]}
            }
        
        failure_reasons = []
        
        # ========================================
        # STEP 1: AI/TTS DETECTION
        # ========================================
        logger.info("🤖 Detecting AI/TTS voice (Google Translate, Ivona, etc.)...")
        ai_detection = detect_ai_voice_offline(captcha_audio_path)
        
        # ❌ Check for errors
        if "error" in ai_detection:
            logger.error(f"❌ AI detection unavailable: {ai_detection['error']}")
            return {
                "passed": False,
                "voice_match": False,
                "similarity_score": 0.0,
                "is_human": False,
                "human_confidence": 0.0,
                "details": {
                    "failure_reasons": [f"AI detection error: {ai_detection['error']}"]
                }
            }
        
        is_human = ai_detection["is_human"]
        human_confidence = ai_detection["confidence"]
        
        if not is_human:
            failure_reasons.append(f"🚨 AI/TTS voice detected (score: {ai_detection['ai_score']:.2f})")
            logger.warning(f"🚨 FRAUD ATTEMPT: AI/TTS detected!")
        
        # ========================================
        # STEP 2: VOICE MATCHING (only if human)
        # ========================================
        voice_match = False
        similarity_score = 0.0
        
        if is_human:
            logger.info("👤 Comparing voices (same person?)...")
            
            verification = verify_speaker_match_resemblyzer(
                captcha_audio_path,
                prayer_audio_path
            )
            
            # ❌ Check for errors
            if "error" in verification:
                logger.error(f"❌ Voice matching unavailable: {verification['error']}")
                return {
                    "passed": False,
                    "voice_match": False,
                    "similarity_score": 0.0,
                    "is_human": False,
                    "human_confidence": 0.0,
                    "details": {
                        "failure_reasons": [f"Voice matching error: {verification['error']}"]
                    }
                }
            
            voice_match = verification["match"]
            similarity_score = verification["score"]
            
            if not voice_match:
                failure_reasons.append(f"Voice mismatch (similarity: {similarity_score:.2f})")
        
        # ========================================
        # FINAL VERDICT
        # ========================================
        verification_passed = is_human and voice_match
        
        logger.info(f"{'✅ PASSED' if verification_passed else '❌ FAILED'}")
        logger.info(f"   - Human: {is_human} (confidence: {human_confidence:.2f})")
        logger.info(f"   - Voice Match: {voice_match} (similarity: {similarity_score:.2f})")
        
        return {
            "passed": verification_passed,
            "voice_match": voice_match,
            "similarity_score": similarity_score,
            "is_human": is_human,
            "human_confidence": human_confidence,
            "details": {
                "failure_reasons": failure_reasons,
                "ai_detection_model": "Librosa Acoustic Analysis",
                "voice_matching_model": "Resemblyzer",
                "threshold": min_similarity,
                "ai_detection_details": ai_detection.get("details", {})
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Verification failed: {e}")
        return {
            "passed": False,
            "voice_match": False,
            "similarity_score": 0.0,
            "is_human": False,
            "human_confidence": 0.0,
            "details": {
                "failure_reasons": [f"Verification error: {str(e)}"]
            }
        }