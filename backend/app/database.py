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

from sqlalchemy import text

def run_schema_migrations(eng):
    """Ensures newly added columns exist in PostgreSQL/SQLite without requiring external alembic runs."""
    statements = [
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sequence_steps JSON DEFAULT '[]'::json;",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS attachment_id INTEGER;",
        "ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS api_key TEXT;",
        "ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS provider VARCHAR;",
        "ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS from_email VARCHAR;",
        "ALTER TABLE attachments ADD COLUMN IF NOT EXISTS file_path VARCHAR;",
        """CREATE TABLE IF NOT EXISTS email_send_logs (
            id SERIAL PRIMARY KEY,
            operation_id VARCHAR(64) UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            buyer_id INTEGER,
            campaign_id INTEGER,
            recipient_email VARCHAR(255) NOT NULL,
            recipient_name VARCHAR(255),
            company_name VARCHAR(255),
            product VARCHAR(255),
            campaign_name VARCHAR(255),
            subject TEXT NOT NULL,
            body_text TEXT,
            body_html TEXT,
            attachment_name VARCHAR(255),
            status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
            sent_at TIMESTAMP WITH TIME ZONE,
            gmail_message_id VARCHAR(255),
            gmail_thread_id VARCHAR(255),
            sender_account_id VARCHAR(255),
            sender_email VARCHAR(255),
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            is_verified BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE
        );""",
        "CREATE INDEX IF NOT EXISTS idx_send_logs_user_status_date ON email_send_logs (user_id, status, created_at);",
        "CREATE INDEX IF NOT EXISTS idx_send_logs_user_recipient ON email_send_logs (user_id, recipient_email);"
    ]
    with eng.connect() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass

try:
    run_schema_migrations(engine)
except Exception as _mig_err:
    logger.warning(f"[MIGRATION] Migration notice: {_mig_err}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
