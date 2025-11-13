from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings
import logging

logger = logging.getLogger(__name__)

mongodb_client: AsyncIOMotorClient = None
database = None

async def connect_to_mongo():
    global mongodb_client, database
    try:
        mongodb_client = AsyncIOMotorClient(settings.MONGODB_URL)
        database = mongodb_client[settings.MONGO_DB_NAME]  # ✅ Zmienione z DATABASE_NAME
        
        await mongodb_client.admin.command('ping')
        logger.info(f"Connected to MongoDB: {settings.MONGO_DB_NAME}")
        
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()
        logger.info("MongoDB connection closed")

def get_database():
    if database is None:
        raise Exception("Database not initialized. Call connect_to_mongo() first.")
    return database
