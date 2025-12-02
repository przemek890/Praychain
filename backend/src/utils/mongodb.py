import logging
from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings

logger = logging.getLogger(__name__)

mongodb_client: AsyncIOMotorClient = None
database = None

async def connect_to_mongo():
    global mongodb_client, database
    try:
        logger.info(f"Connecting to MongoDB: {settings.MONGO_DB_NAME}")
        mongodb_client = AsyncIOMotorClient(settings.MONGODB_URL)
        database = mongodb_client[settings.MONGO_DB_NAME]
        
        await mongodb_client.admin.command('ping')
        logger.info("MongoDB connection successful")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise

async def close_mongo_connection():
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()
        logger.info("MongoDB connection closed")

def get_database():
    return database
