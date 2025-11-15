import os
import logging
import requests
from typing import Dict
import time

logger = logging.getLogger(__name__)

# API Keys
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")

# Resemble Detect
RESEMBLE_API_TOKEN = os.getenv("RESEMBLE_API_TOKEN", "")
RESEMBLE_DETECT_URL = os.getenv("RESEMBLE_DETECT_URL", "https://api.resemble.ai/v1/detect")

ASSEMBLYAI_UPLOAD_URL = "https://api.assemblyai.com/v2/upload"
ASSEMBLYAI_TRANSCRIPT_URL = "https://api.assemblyai.com/v2/transcript"

def upload_audio_to_assemblyai(audio_path: str) -> str:
    headers = {"authorization": ASSEMBLYAI_API_KEY}
    with open(audio_path, "rb") as f:
        r = requests.post(ASSEMBLYAI_UPLOAD_URL, headers=headers, data=f, timeout=120)
    if r.status_code != 200:
        raise Exception(f"Upload failed: {r.text}")
    return r.json()["upload_url"]

def analyze_audio_with_assemblyai(audio_url: str) -> Dict:
    headers = {"authorization": ASSEMBLYAI_API_KEY, "content-type": "application/json"}
    data = {"audio_url": audio_url, "speaker_labels": True}
    r = requests.post(ASSEMBLYAI_TRANSCRIPT_URL, json=data, headers=headers, timeout=30)
    if r.status_code != 200:
        raise Exception(f"Analysis failed: {r.text}")
    transcript_id = r.json()["id"]
    polling_endpoint = f"{ASSEMBLYAI_TRANSCRIPT_URL}/{transcript_id}"
    while True:
        res = requests.get(polling_endpoint, headers=headers, timeout=30).json()
        if res["status"] == "completed":
            return res
        if res["status"] == "error":
            raise Exception(f"AssemblyAI error: {res.get('error', 'Unknown error')}")
        time.sleep(2)

def _parse_resemble_detect(payload: Dict) -> Dict:
    """
    Obsłuż różne formaty odpowiedzi.
    Oczekiwane pola: label (human/real vs synthetic/ai/fake), confidence/score.
    """
    label = (
        payload.get("label")
        or payload.get("result")
        or payload.get("prediction")
        or (payload.get("results", [{}])[0].get("label") if isinstance(payload.get("results"), list) and payload["results"] else None)
    )
    confidence = (
        payload.get("confidence")
        or payload.get("score")
        or (payload.get("results", [{}])[0].get("confidence") if isinstance(payload.get("results"), list) and payload["results"] else None)
        or 0.0
    )
    label_str = str(label or "").lower()
    is_synthetic = any(k in label_str for k in ["synthetic", "ai", "fake"])
    # Jeżeli label jest puste, ale jest score, traktuj >0.5 jako AI (ostrożność)
    if label is None and float(confidence) > 0.5:
        is_synthetic = True
    return {"is_synthetic": bool(is_synthetic), "confidence": float(confidence or 0.0)}

def detect_deepfake_resemble(audio_path: str) -> Dict:
    """
    Resemble Detect — wykrywanie AI voice.
    Blokuje, jeśli:
    - brak tokenu,
    - błąd sieci/HTTP (!= 200),
    - odpowiedź nie do zinterpretowania.
    """
    if not RESEMBLE_API_TOKEN:
        logger.error("RESEMBLE_API_TOKEN not set - BLOCKING tokens")
        raise Exception("Resemble Detect token missing")

    try:
        logger.info(f"🔍 Resemble Detect: {os.path.basename(audio_path)}")
        with open(audio_path, "rb") as f:
            files = {"file": (os.path.basename(audio_path), f, "audio/wav")}
            headers = {
                # większość integracji używa x-api-key; jeśli masz inny nagłówek w planie enterprise, ustaw RESEMBLE_DETECT_URL i modyfikuj tu
                "x-api-key": RESEMBLE_API_TOKEN
            }
            r = requests.post(RESEMBLE_DETECT_URL, headers=headers, files=files, timeout=120)

        if r.status_code == 200:
            data = r.json()
            parsed = _parse_resemble_detect(data)
            logger.info(
                f"Resemble result: {'❌ AI' if parsed['is_synthetic'] else '✅ HUMAN'} "
                f"(confidence: {parsed['confidence']:.2%})"
            )
            return {
                "is_synthetic": parsed["is_synthetic"],
                "confidence": parsed["confidence"],
                "model": "Resemble Detect",
                "error": None,
            }

        # Znane błędy → blokuj
        if r.status_code in (401, 403):
            raise Exception("Unauthorized to Resemble Detect (check API token)")
        if r.status_code == 404:
            raise Exception("Resemble Detect endpoint not found")
        if r.status_code == 429:
            raise Exception("Resemble Detect rate limit exceeded")
        if r.status_code == 422:
            raise Exception(f"Unprocessable audio for Resemble Detect: {r.text}")

        raise Exception(f"Resemble Detect HTTP {r.status_code}: {r.text}")

    except Exception as e:
        logger.error(f"❌ Resemble Detect error: {e}")
        # Każdy błąd = blokada (bezpieczeństwo)
        raise

def verify_recording_session(
    prayer_audio: str,
    captcha_audio: str,
    min_similarity: float = 0.65
) -> Dict:
    logger.info("🎙️ Voice verification starting...")
    try:
        # 1) AssemblyAI — porównanie głosów
        logger.info("Step 1: AssemblyAI speaker matching...")
        prayer_url = upload_audio_to_assemblyai(prayer_audio)
        captcha_url = upload_audio_to_assemblyai(captcha_audio)

        prayer_res = analyze_audio_with_assemblyai(prayer_url)
        captcha_res = analyze_audio_with_assemblyai(captcha_url)

        prayer_utts = prayer_res.get("utterances", [])
        captcha_utts = captcha_res.get("utterances", [])

        prayer_speaker = prayer_utts[0].get("speaker") if prayer_utts else "A"
        captcha_speaker = captcha_utts[0].get("speaker") if captcha_utts else "B"

        voice_match = prayer_speaker == captcha_speaker

        prayer_conf = prayer_res.get("confidence", 0.0)
        captcha_conf = captcha_res.get("confidence", 0.0)
        similarity = (prayer_conf + captcha_conf) / 2

        logger.info(f"Speaker match: {voice_match} ({prayer_speaker} vs {captcha_speaker}), similarity: {similarity:.2%}")

        # 2) Resemble Detect — AI voice
        logger.info("Step 2: Resemble AI voice detection...")
        from src.config import REPLICATE_DELAY_SECONDS

        prayer_det = detect_deepfake_resemble(prayer_audio)

        logger.info(f"⏱️ Waiting {REPLICATE_DELAY_SECONDS}s (polite rate limit)...")
        time.sleep(REPLICATE_DELAY_SECONDS)

        captcha_det = detect_deepfake_resemble(captcha_audio)

        prayer_synth = prayer_det["is_synthetic"]
        captcha_synth = captcha_det["is_synthetic"]

        logger.info(f"Prayer: {'❌ AI' if prayer_synth else '✅ HUMAN'}")
        logger.info(f"Captcha: {'❌ AI' if captcha_synth else '✅ HUMAN'}")

        failure_reasons = []

        if not voice_match:
            failure_reasons.append(f"Different speakers: {prayer_speaker} vs {captcha_speaker}")

        if similarity < min_similarity:
            failure_reasons.append(f"Low similarity: {similarity:.0%} < {min_similarity:.0%}")

        if prayer_synth:
            failure_reasons.append(f"Prayer is AI-generated (confidence: {prayer_det['confidence']:.0%})")

        if captcha_synth:
            failure_reasons.append(f"Captcha is AI-generated (confidence: {captcha_det['confidence']:.0%})")

        passed = len(failure_reasons) == 0

        if passed:
            logger.info("✅ Verification PASSED - Real human voice")
        else:
            logger.warning(f"❌ Verification FAILED: {failure_reasons}")

        return {
            "voice_match": voice_match,
            "voice_similarity": similarity,
            "prayer_synthetic": prayer_synth,
            "captcha_synthetic": captcha_synth,
            "passed": passed,
            "details": {
                "prayer_deepfake_confidence": prayer_det["confidence"],
                "captcha_deepfake_confidence": captcha_det["confidence"],
                "failure_reasons": failure_reasons,
                "api_used": "AssemblyAI + Resemble Detect",
                "prayer_speaker": prayer_speaker,
                "captcha_speaker": captcha_speaker,
            },
        }

    except Exception as e:
        logger.error(f"❌ Verification error: {e}")
        return {
            "voice_match": False,
            "voice_similarity": 0.0,
            "prayer_synthetic": True,
            "captcha_synthetic": True,
            "passed": False,
            "details": {
                "failure_reasons": [f"Verification error: {str(e)}"],
                "api_used": "Failed",
                "prayer_deepfake_confidence": 0.0,
                "captcha_deepfake_confidence": 0.0,
                "prayer_speaker": "unknown",
                "captcha_speaker": "unknown",
            },
        }