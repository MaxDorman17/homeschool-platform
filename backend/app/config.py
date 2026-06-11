from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    APP_NAME: str = "Homeschool Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database - SQLite for simplicity
    DATABASE_URL: str = "sqlite:///./homeschool.db"

    # Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-in-production-123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # File Upload
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
