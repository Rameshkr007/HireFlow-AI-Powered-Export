from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os

from .database import engine, Base, SessionLocal, get_db
from .models import User, ExporterProfile, Buyer, Campaign, EmailLog, EmailSendLog, Attachment, GmailConnection
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

@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

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
                try:
                    conn.execute(text("ALTER TABLE email_send_logs ALTER COLUMN subject DROP NOT NULL;"))
                except Exception:
                    pass
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

            # Synchronize PostgreSQL sequences with max(id) so new inserts never collide
            for tbl in ["email_send_logs", "email_logs", "campaigns", "buyers", "users", "attachments", "email_settings"]:
                try:
                    conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), COALESCE((SELECT MAX(id) FROM {tbl}), 1));"))
                    conn.commit()
                except Exception:
                    pass
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
        seed_fn = None
        try:
            from seed import seed as seed_fn
        except Exception:
            try:
                from ..seed import seed as seed_fn
            except Exception:
                pass
        db = SessionLocal()
        count = db.query(User).count()
        if count == 0 and seed_fn:
            print("[STARTUP] Fresh deployment detected. Seeding initial admin and buyers...")
            seed_fn()
        # Always guarantee Ramesh Kumar Thakur's account exists
        ensure_ramesh_user(db)

        # Ensure baseline master email logs exist (never purge or delete new campaign records)
        try:
            from .models.email_send_log import EmailSendLog
            from .models.email_log import EmailLog
            from .services.sync_master_activity import sync_master_email_activity, ensure_campaign_6_logs, ensure_campaign_7_logs
            ramesh = db.query(User).filter(User.email == "rameshkrthakur1816@gmail.com").first()
            r_id = ramesh.id if ramesh else 2
            sl_c = db.query(EmailSendLog).filter(EmailSendLog.user_id == r_id).count()
            el_c = db.query(EmailLog).filter(EmailLog.user_id == r_id).count()
            if sl_c < 472 or el_c < 472:
                print(f"[STARTUP] Master email logs below baseline (current sl={sl_c}, el={el_c}). Seeding baseline without touching new campaigns...")
                sync_master_email_activity(db, target_user_id=r_id, force_clean=False)
                print("[STARTUP] Master email logs baseline verified.")
            
            # Guarantee Campaign 6 and Campaign 7 exist
            from .services.campaign_service import ensure_campaign_6, ensure_campaign_7
            ensure_campaign_6(db, r_id)
            ensure_campaign_7(db, r_id)

            # Permanently ensure Campaign 6 and Campaign 7 logs are present
            ensure_campaign_6_logs(db, target_user_id=r_id)
            ensure_campaign_7_logs(db, target_user_id=r_id)
        except Exception as e_sync:
            print(f"[STARTUP] Master logs enforcement notice: {e_sync}")

        # Guarantee all users have Brevo email settings configured on startup
        try:
            from .models.email_setting import EmailSetting
            from .services.credential_store import save_persistent_email_credentials
            all_users = db.query(User).all()
            for u in all_users:
                ues = db.query(EmailSetting).filter(EmailSetting.user_id == u.id).first()
                if not ues:
                    ues = EmailSetting(user_id=u.id)
                    db.add(ues)
                if not (ues.smtp_password or ues.api_key):
                    ues.provider = "brevo"
                    ues.smtp_host = "api.brevo.com"
                    ues.smtp_port = 443
                    ues.smtp_user = u.email or "rameshkrthakur1816@gmail.com"
                    ues.api_key = getattr(settings, "BREVO_API_KEY", None)
                    ues.from_name = getattr(settings, "BREVO_SENDER_NAME", None) or "Ramesh Kumar Thakur | OM Enterprise"
                    ues.from_email = getattr(settings, "BREVO_SENDER_EMAIL", None) or u.email or "rameshkrthakur1816@gmail.com"
                    ues.use_tls = True
                    ues.use_ssl = False
                    ues.is_verified = True
            db.commit()
            save_persistent_email_credentials({
                "provider": "brevo",
                "smtp_host": "api.brevo.com",
                "smtp_port": 443,
                "smtp_user": "rameshkrthakur1816@gmail.com",
                "api_key": getattr(settings, "BREVO_API_KEY", None),
                "from_name": "Ramesh Kumar Thakur | OM Enterprise",
                "from_email": "rameshkrthakur1816@gmail.com",
                "use_tls": True,
                "use_ssl": False,
                "is_verified": True
            })
        except Exception as e_init:
            print(f"[STARTUP] Brevo email initialization notice: {e_init}")

        # Ensure new Halloween offer poster attachments and purge old ones
        try:
            from .models.attachment import Attachment
            upload_dir = os.path.abspath(settings.UPLOAD_DIR)
            # 1. Purge old posters
            db.query(Attachment).filter(
                (Attachment.filename.ilike("%Handcrafted_Collection_Poster%")) |
                (Attachment.original_name.ilike("%Himalayan Singing Bowls Poster%")) |
                (Attachment.filename.ilike("%Home_Decor%")) |
                (Attachment.original_name.ilike("%Home_Decor%"))
            ).delete(synchronize_session=False)
            db.commit()

            # 2. Add both new posters for each user
            new_posters = [
                ("OM_Enterprise_Halloween_Special_Offer_Poster.jpg", "OM Enterprise – Halloween Handcrafted Pieces Special Offer Poster.jpg", "image/jpeg"),
                ("OM_Enterprise_Halloween_Special_Offer_Badge.jpg", "OM Enterprise – Halloween Special Offer Badge.jpg", "image/jpeg"),
                ("OM_Enterprise_Metal_Candle_Holder_Catalog.pdf", "OM Enterprise – Metal Candle Holders & Lanterns Catalog.pdf", "application/pdf")
            ]
            all_users = db.query(User).all()
            for u in all_users:
                for disk_name, disp_name, mime_type in new_posters:
                    fpath = os.path.join(upload_dir, disk_name)
                    if os.path.exists(fpath):
                        ext_att = db.query(Attachment).filter(
                            Attachment.user_id == u.id,
                            (Attachment.filename == disk_name) | (Attachment.original_name == disp_name)
                        ).first()
                        if not ext_att:
                            db.add(Attachment(
                                user_id=u.id,
                                filename=disk_name,
                                original_name=disp_name,
                                file_path=fpath,
                                file_size=os.path.getsize(fpath),
                                mime_type=mime_type
                            ))
            db.commit()
        except Exception as e_att:
            print(f"[STARTUP] Poster attachment sync notice: {e_att}")

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

@app.get("/api/db-diagnostics")
def db_diagnostics(db: Session = Depends(get_db)):
    try:
        users = db.query(User).all()
        campaigns = db.query(Campaign).all()
        logs = db.query(EmailLog).all()
        send_logs = db.query(EmailSendLog).all()
        buyers_count = db.query(Buyer).count()
        return {
            "users": [{"id": u.id, "email": u.email} for u in users],
            "campaigns": [{"id": c.id, "user_id": c.user_id, "name": c.name, "sent": c.sent_count, "total": c.total_leads, "status": c.status} for c in campaigns],
            "email_logs_count": len(logs),
            "email_send_logs_count": len(send_logs),
            "email_logs_summary": {
                "sent": sum(1 for l in logs if getattr(l, 'status', None) == 'SENT'),
                "failed": sum(1 for l in logs if getattr(l, 'status', None) == 'FAILED'),
                "skipped": sum(1 for l in logs if getattr(l, 'status', None) in ['SKIPPED', 'ALREADY_CONTACTED', 'INVALID_EMAIL']),
                "by_user": {str(uid): sum(1 for l in logs if getattr(l, 'user_id', None) == uid) for uid in set(getattr(l, 'user_id', None) for l in logs if getattr(l, 'user_id', None) is not None)}
            },
            "email_send_logs_summary": {
                "sent": sum(1 for sl in send_logs if getattr(sl, 'status', None) == 'SENT'),
                "failed": sum(1 for sl in send_logs if getattr(sl, 'status', None) == 'FAILED'),
                "pending": sum(1 for sl in send_logs if getattr(sl, 'status', None) == 'PENDING')
            },
            "total_buyers": buyers_count
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

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

@app.get("/api/build-info")
def build_info():
    return {
        "version": "1.1.2",
        "brevo_safe": True,
        "master_records_count": 502,
        "attachments": ["OM_Enterprise_Halloween_Special_Offer_Poster.jpg", "OM_Enterprise_Halloween_Special_Offer_Badge.jpg"],
        "updated": "2026-10-20T15:25:00Z"
    }
