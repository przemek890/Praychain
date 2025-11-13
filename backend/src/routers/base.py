from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def root():
    return {
        "message": "Praychain API",
        "version": "1.0.0",
        "endpoints": {
            "transcription": "/api/transcribe",
            "analysis": "/api/analysis",
            "bible": "/api/bible/random-quote",
            "health": "/health"
        }
    }

@router.get("/health")
async def health_check():
    """Health check endpoint for mobile app discovery"""
    return {"status": "ok", "service": "praychain-backend"}

@router.get("/api/health")
async def api_health_check():
    """Health check endpoint under /api prefix"""
    return {"status": "ok", "service": "praychain-backend"}
