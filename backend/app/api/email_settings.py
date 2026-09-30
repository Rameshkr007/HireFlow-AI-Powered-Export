from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models.user import User
from ..models.email_setting import EmailSetting
from ..schemas.email_setting import EmailSettingCreateOrUpdate, EmailSettingResponse, TestEmailRequest
from ..services.auth_service import get_current_user
from ..services.email_service import test_smtp_dispatch, clean_password
from ..config import settings

router = APIRouter(prefix="/api/email-settings", tags=["email-settings"])

def mask_password(pwd: Optional[str]) -> Optional[str]:
    if not pwd:
        return None
    cleaned = pwd.strip()
    if len(cleaned) <= 4:
        return "••••"
    return "••••••••" + cleaned[-4:]

@router.get("", response_model=EmailSettingResponse)
def get_email_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    setting = db.query(EmailSetting).filter(EmailSetting.user_id == current_user.id).first()
    
    # Fallback: if not configured for this user, check any recent saved EmailSetting in DB
    if not (setting and (setting.smtp_password or setting.api_key or setting.smtp_user)):
        shared = db.query(EmailSetting).filter(
            (EmailSetting.smtp_password.isnot(None)) | (EmailSetting.api_key.isnot(None))
        ).order_by(EmailSetting.updated_at.desc()).first()
        if shared:
            if not setting:
                setting = EmailSetting(user_id=current_user.id)
                db.add(setting)
            setting.provider = shared.provider
            setting.smtp_host = shared.smtp_host
            setting.smtp_port = shared.smtp_port
            setting.smtp_user = shared.smtp_user
            setting.smtp_password = shared.smtp_password
            setting.api_key = shared.api_key
            setting.from_name = shared.from_name
            setting.from_email = shared.from_email
            setting.use_tls = shared.use_tls
            setting.use_ssl = shared.use_ssl
            setting.is_verified = shared.is_verified
            db.commit()
            db.refresh(setting)

    if setting:
        return EmailSettingResponse(
            id=setting.id,
            user_id=setting.user_id,
            provider=setting.provider or "gmail",
            smtp_host=setting.smtp_host or "smtp.gmail.com",
            smtp_port=setting.smtp_port or 587,
            smtp_user=setting.smtp_user or "exportindia2026us@gmail.com",
            from_name=setting.from_name or "Ramesh Kumar Thakur | OM Enterprise",
            from_email=setting.from_email or setting.smtp_user or "exportindia2026us@gmail.com",
            use_tls=setting.use_tls if setting.use_tls is not None else True,
            use_ssl=setting.use_ssl if setting.use_ssl is not None else False,
            is_verified=setting.is_verified or False,
            has_password=bool(setting.smtp_password),
            masked_password=mask_password(setting.smtp_password),
            api_key=setting.api_key,
            has_api_key=bool(setting.api_key),
            created_at=setting.created_at,
            updated_at=setting.updated_at
        )

    # Check if system-wide environment variables provide SMTP
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        return EmailSettingResponse(
            id=0,
            user_id=current_user.id,
            provider="environment",
            smtp_host=settings.SMTP_HOST or "smtp.gmail.com",
            smtp_port=settings.SMTP_PORT or 587,
            smtp_user=settings.SMTP_USER,
            from_name=settings.SMTP_FROM_NAME or "Ramesh Kumar Thakur | OM Enterprise",
            from_email=settings.SMTP_FROM_EMAIL or settings.SMTP_USER,
            use_tls=settings.SMTP_USE_TLS,
            use_ssl=settings.SMTP_USE_SSL,
            is_verified=True,
            has_password=True,
            masked_password=mask_password(settings.SMTP_PASSWORD)
        )

    # Default unconfigured response
    return EmailSettingResponse(
        id=None,
        user_id=current_user.id,
        provider="gmail",
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        smtp_user=current_user.email,
        from_name="Ramesh Kumar Thakur | OM Enterprise",
        from_email=current_user.email,
        use_tls=True,
        use_ssl=False,
        is_verified=False,
        has_password=False,
        masked_password=None
    )

@router.post("", response_model=EmailSettingResponse)
def save_email_settings(
    payload: EmailSettingCreateOrUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    setting = db.query(EmailSetting).filter(EmailSetting.user_id == current_user.id).first()
    
    if not setting:
        setting = EmailSetting(user_id=current_user.id)
        db.add(setting)

    setting.provider = payload.provider or "gmail"
    setting.smtp_host = payload.smtp_host or "smtp.gmail.com"
    setting.smtp_port = payload.smtp_port or 587
    setting.smtp_user = payload.smtp_user.strip() if payload.smtp_user else "exportindia2026us@gmail.com"
    
    # Only update password if provided
    if payload.smtp_password and payload.smtp_password.strip():
        setting.smtp_password = clean_password(payload.smtp_password)
        setting.is_verified = False

    if payload.api_key and payload.api_key.strip():
        setting.api_key = payload.api_key.strip()
        setting.is_verified = False

    setting.from_name = payload.from_name.strip() if payload.from_name else "Ramesh Kumar Thakur | OM Enterprise"
    setting.from_email = payload.from_email.strip() if payload.from_email else (payload.smtp_user.strip() if payload.smtp_user else "exportindia2026us@gmail.com")
    setting.use_tls = payload.use_tls if payload.use_tls is not None else True
    setting.use_ssl = payload.use_ssl if payload.use_ssl is not None else False

    db.commit()
    db.refresh(setting)

    return EmailSettingResponse(
        id=setting.id,
        user_id=setting.user_id,
        provider=setting.provider,
        smtp_host=setting.smtp_host,
        smtp_port=setting.smtp_port,
        smtp_user=setting.smtp_user,
        api_key=setting.api_key,
        has_api_key=bool(setting.api_key),
        from_name=setting.from_name,
        from_email=setting.from_email,
        use_tls=setting.use_tls,
        use_ssl=setting.use_ssl,
        is_verified=setting.is_verified,
        has_password=bool(setting.smtp_password),
        masked_password=mask_password(setting.smtp_password),
        created_at=setting.created_at,
        updated_at=setting.updated_at
    )

@router.post("/test")
def test_connection(
    payload: Optional[TestEmailRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target = payload.to_email if payload and payload.to_email else current_user.email
    result = test_smtp_dispatch(db, current_user.id, target_email=target)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Email dispatch test failed"))
    return result

@router.delete("")
def disconnect_email(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    setting = db.query(EmailSetting).filter(EmailSetting.user_id == current_user.id).first()
    if setting:
        db.delete(setting)
        db.commit()
    return {"success": True, "message": "Email settings removed"}
