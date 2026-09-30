from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./hireflow.db"
    JWT_SECRET: str = "hireflow-permanent-jwt-auth-secret-key-2026-om-enterprise"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 525600  # 365 Days (1 year permanent login)
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

    # ── SMTP Outbound Email Settings (Gmail App Password, Zoho, Custom) ───────
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_NAME: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False

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
