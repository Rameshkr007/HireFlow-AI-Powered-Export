import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

logger = logging.getLogger(__name__)

def get_engine():
    raw_url = settings.DATABASE_URL or "sqlite:///./hireflow.db"

    # Render provides postgres://, SQLAlchemy requires postgresql://
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql://", 1)

    # In cloud environments (Render, Railway, Heroku), localhost is unreachable
    is_cloud = "RENDER" in os.environ or "PORT" in os.environ
    if is_cloud and ("localhost" in raw_url or "127.0.0.1" in raw_url):
        logger.warning("[DATABASE] Detected localhost DATABASE_URL in cloud environment. Falling back to local SQLite.")
        raw_url = "sqlite:///./hireflow.db"

    connect_args = {"check_same_thread": False} if "sqlite" in raw_url else {}
    
    try:
        eng = create_engine(raw_url, connect_args=connect_args)
        # Verify connection
        with eng.connect() as conn:
            pass
        logger.info(f"[DATABASE] Connected successfully to: {raw_url.split('@')[-1] if '@' in raw_url else raw_url}")
        return eng
    except Exception as e:
        logger.error(f"[DATABASE] Connection to {raw_url} failed: {e}. Falling back to SQLite.")
        fallback_url = "sqlite:///./hireflow.db"
        return create_engine(fallback_url, connect_args={"check_same_thread": False})

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
