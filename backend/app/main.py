from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from .database import engine, Base, SessionLocal
from .models import User, ExporterProfile, Buyer, Campaign, EmailLog, Attachment, GmailConnection
from .api import auth, profile, buyers, discovery, campaigns, email_activity, reports, gmail, attachments, dashboard
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
        upload_dir = os.path.abspath(settings.UPLOAD_DIR)
        os.makedirs(upload_dir, exist_ok=True)
    except Exception:
        pass

    try:
        # Auto-seed if database has no users
        from .models.user import User
        from ..seed import seed
        db = SessionLocal()
        count = db.query(User).count()
        db.close()
        if count == 0:
            print("[STARTUP] Fresh deployment detected. Seeding initial admin and buyers...")
            seed()
    except Exception as e:
        print(f"[STARTUP] Auto-seed skipped: {e}")

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(buyers.router)
app.include_router(discovery.router)
app.include_router(campaigns.router)
app.include_router(email_activity.router)
app.include_router(reports.router)
app.include_router(gmail.router)
app.include_router(attachments.router)
app.include_router(dashboard.router)

@app.get("/")
def root():
    return {"message": "HireFlow API is running", "docs": "/docs", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}
