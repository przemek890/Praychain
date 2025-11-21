import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import settings
from src.utils.mongodb import connect_to_mongo, close_mongo_connection
from src.routers import base, transcription, analysis, bible, prayer, tokens, charity, users

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting PrayChain API...")
    await connect_to_mongo()
    logger.info(f"📡 Server running on {settings.BACKEND_HOST}:{settings.BACKEND_PORT}")
    yield
    # Shutdown
    logger.info("👋 Shutting down...")
    await close_mongo_connection()

app = FastAPI(
    title="PrayChain API",
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

# Routers
app.include_router(base.router)
app.include_router(transcription.router)
app.include_router(analysis.router)
app.include_router(bible.router)
app.include_router(prayer.router)
app.include_router(tokens.router)
app.include_router(charity.router)
app.include_router(users.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True
    )
