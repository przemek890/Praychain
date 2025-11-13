from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    MONGO_DB_NAME: str
    MONGODB_URL: str
    BACKEND_HOST: str = "0.0.0.0"  # ✅ Nowe
    BACKEND_PORT: int = 8000        # ✅ Nowe

    class Config:
        env_file = ".env"

settings = Settings()
