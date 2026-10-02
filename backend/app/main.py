from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from .database import engine, Base, SessionLocal
from .models import User, ExporterProfile, Buyer, Campaign, EmailLog, Attachment, GmailConnection
from .api import auth, profile, buyers, discovery, campaigns, email_activity, reports, gmail, attachments, dashboard, email_settings
from .config import settings

app = FastAPI(
    title="HireFlow API",
    description="AI-Powered Export Buyer Discovery & Outreach Automation Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[STARTUP] Notice: {e}")

    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE buyers ADD COLUMN IF NOT EXISTS city VARCHAR;"))
                conn.execute(text("ALTER TABLE buyers ADD COLUMN IF NOT EXISTS state VARCHAR;"))
                conn.execute(text("ALTER TABLE buyers ADD COLUMN IF NOT EXISTS address TEXT;"))
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sequence_steps JSON;"))
                conn.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS attachment_ids JSON;"))
                conn.commit()
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE buyers ADD COLUMN city VARCHAR;"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE buyers ADD COLUMN state VARCHAR;"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE buyers ADD COLUMN address TEXT;"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE campaigns ADD COLUMN sequence_steps JSON;"))
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE campaigns ADD COLUMN attachment_ids JSON;"))
                except Exception:
                    pass
                conn.commit()
    except Exception as e:
        print(f"[STARTUP] Migration notice: {e}")

    try:
        upload_dir = os.path.abspath(settings.UPLOAD_DIR)
        os.makedirs(upload_dir, exist_ok=True)
    except Exception:
        pass

    try:
        from .models.user import User
        from .services.auth_service import ensure_ramesh_user
        from ..seed import seed
        db = SessionLocal()
        count = db.query(User).count()
        if count == 0:
            print("[STARTUP] Fresh deployment detected. Seeding initial admin and buyers...")
            seed()
        # Always guarantee Ramesh Kumar Thakur's account exists
        ensure_ramesh_user(db)
        db.close()
    except Exception as e:
        print(f"[STARTUP] User initialization notice: {e}")

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(buyers.router)
app.include_router(discovery.router)
app.include_router(campaigns.router)
app.include_router(email_activity.router)
app.include_router(reports.router)
app.include_router(gmail.router)
app.include_router(email_settings.router)
app.include_router(attachments.router)
app.include_router(dashboard.router)

@app.get("/")
def root():
    return {"message": "HireFlow API is running", "docs": "/docs", "version": "1.0.0"}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "engines": {
            "tradewind": bool(settings.TRADEWIND_API_KEY),
            "serpapi": bool(settings.SERPAPI_KEY),
            "apollo": bool(settings.APOLLO_API_KEY),
            "openai": bool(settings.OPENAI_API_KEY),
        },
    }

@app.get("/api/test-tradewind")
async def test_tradewind():
    if not settings.TRADEWIND_API_KEY:
        return {"configured": False, "message": "TRADEWIND_API_KEY is not set"}

    key_len = len(settings.TRADEWIND_API_KEY)
    key_preview = (settings.TRADEWIND_API_KEY[:4] + "..." + settings.TRADEWIND_API_KEY[-4:]) if key_len > 8 else "***"

    endpoints = [
        "https://app.trade-wind.co/api/customs/search",
        "https://app.trade-wind.co/api/agentic/search",
        "https://api.trade-wind.co/api/customs/search",
    ]
    if settings.TRADEWIND_API_URL and "tradewind.com" not in settings.TRADEWIND_API_URL:
        base = settings.TRADEWIND_API_URL.rstrip("/")
        endpoints.insert(0, f"{base}/api/customs/search")
        endpoints.insert(1, base)

    headers = {
        "Authorization": f"Bearer {settings.TRADEWIND_API_KEY}",
        "x-api-key": settings.TRADEWIND_API_KEY,
        "Accept": "application/json",
        "User-Agent": "HireFlow/2.0",
    }

    import httpx
    diagnostic_results = []
    async with httpx.AsyncClient(timeout=5.0) as client:
        for ep in endpoints:
            try:
                r_post = await client.post(ep, headers=headers, json={"query": "Singing Bowls", "limit": 5})
                diagnostic_results.append({
                    "endpoint": ep,
                    "method": "POST",
                    "status_code": r_post.status_code,
                    "response": r_post.text[:200]
                })
            except Exception as e:
                diagnostic_results.append({
                    "endpoint": ep,
                    "method": "POST",
                    "error": str(e)
                })

            try:
                r_get = await client.get(ep, headers=headers, params={"query": "Singing Bowls", "limit": 5})
                diagnostic_results.append({
                    "endpoint": ep,
                    "method": "GET",
                    "status_code": r_get.status_code,
                    "response": r_get.text[:200]
                })
            except Exception as e:
                diagnostic_results.append({
                    "endpoint": ep,
                    "method": "GET",
                    "error": str(e)
                })

    return {
        "key_preview": key_preview,
        "key_length": key_len,
        "results": diagnostic_results
    }
