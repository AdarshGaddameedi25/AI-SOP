"""
Application configuration loaded from environment variables via python-dotenv.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""

    SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URL", "")
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ACCESS_TOKEN_EXPIRES: int = 3600

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    DEBUG: bool = True
    TESTING: bool = False


class TestingConfig(Config):
    """Overrides for pytest using SQLite in-memory."""

    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test_secret_key_32_characters_ok"
    JWT_ACCESS_TOKEN_EXPIRES = False  # type: ignore[assignment]


config_map = {
    "default": Config,
    "testing": TestingConfig,
}

