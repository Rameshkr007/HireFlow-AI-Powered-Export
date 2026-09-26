from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./hireflow.db"
    JWT_SECRET: str = "hireflow-super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    AI_PROVIDER: str = "gemini"  # gemini or openai
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/gmail/callback"
    GMAIL_MODE: str = "demo"  # demo or real
    FRONTEND_URL: str = "http://localhost:5173"
    UPLOAD_DIR: str = "../attachments"
    MAX_FILE_SIZE_MB: int = 10

    # ── Buyer Discovery API Keys ──────────────────────────────────────────────
    # Apollo.io  →  https://app.apollo.io/#/settings/integrations/api
    APOLLO_API_KEY: Optional[str] = None

    # Hunter.io  →  https://hunter.io/api-keys
    HUNTER_API_KEY: Optional[str] = None

    # SerpAPI    →  https://serpapi.com/dashboard (Takes normal Gmail!)
    SERPAPI_KEY: Optional[str] = None

    # Tomba.io  →  https://tomba.io (Hunter.io alternative that accepts Gmail!)
    TOMBA_API_KEY: Optional[str] = None
    TOMBA_API_SECRET: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
