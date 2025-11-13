import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.utils.mongodb import connect_to_mongo, close_mongo_connection
from src.routers import base, transcription, analysis, bible, prayer, tokens, charity

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await connect_to_mongo()
        logger.info("MongoDB connected successfully")
        
        # Initialize ML models in background (non-blocking)
        try:
            from src.routers.analysis import initialize_models
            initialize_models()
            logger.info("ML models initialized")
        except Exception as e:
            logger.error(f"Failed to initialize ML models: {e}")
            logger.warning("Application will start without ML models. They will be loaded on first use.")
        
        yield
        
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise
    finally:
        # Shutdown
        await close_mongo_connection()
        logger.info("Application shutdown complete")

app = FastAPI(
    title="Praychain API",
    description="API for audio transcription and emotion/focus analysis",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# Register routers
app.include_router(base.router)
app.include_router(transcription.router)
app.include_router(analysis.router)
app.include_router(bible.router)
app.include_router(prayer.router)
app.include_router(tokens.router)
app.include_router(charity.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
