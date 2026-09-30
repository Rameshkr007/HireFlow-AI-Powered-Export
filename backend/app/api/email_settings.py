from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models.user import User
from ..models.email_setting import EmailSetting
from ..schemas.email_setting import EmailSettingCreateOrUpdate, EmailSettingResponse, TestEmailRequest
from ..services.auth_service import get_current_user
from ..services.email_service import test_smtp_dispatch, clean_password
from ..services.credential_store import save_persistent_email_credentials, load_persistent_email_credentials
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
    has_creds = bool(setting and (setting.smtp_password or setting.api_key))

    # Fallback 1: If current user lacks password/api_key, check any other user's saved credentials in DB
    if not has_creds:
        shared = db.query(EmailSetting).filter(
            ((EmailSetting.smtp_password.isnot(None)) & (EmailSetting.smtp_password != "")) |
            ((EmailSetting.api_key.isnot(None)) & (EmailSetting.api_key != ""))
        ).order_by(EmailSetting.updated_at.desc()).first()

        if shared and (shared.smtp_password or shared.api_key):
            if not setting:
                setting = EmailSetting(user_id=current_user.id)
                db.add(setting)
            setting.provider = shared.provider
            setting.smtp_host = shared.smtp_host
            setting.smtp_port = shared.smtp_port
            setting.smtp_user = shared.smtp_user or current_user.email or "rameshkrthakur1816@gmail.com"
            setting.smtp_password = shared.smtp_password
            setting.api_key = shared.api_key
            setting.from_name = shared.from_name or "Ramesh Kumar Thakur | OM Enterprise"
            setting.from_email = shared.from_email or shared.smtp_user or current_user.email or "rameshkrthakur1816@gmail.com"
            setting.use_tls = shared.use_tls
            setting.use_ssl = shared.use_ssl
            setting.is_verified = True
            db.commit()
            db.refresh(setting)
            has_creds = True

    # Fallback 2: Check persistent disk store (survives DB wiping / server restarts)
    if not has_creds:
        file_creds = load_persistent_email_credentials()
        if file_creds and (file_creds.get("smtp_password") or file_creds.get("api_key")):
            if not setting:
                setting = EmailSetting(user_id=current_user.id)
                db.add(setting)
            setting.provider = file_creds.get("provider", "gmail")
            setting.smtp_host = file_creds.get("smtp_host", "smtp.gmail.com")
            setting.smtp_port = int(file_creds.get("smtp_port", 587))
            setting.smtp_user = file_creds.get("smtp_user") or current_user.email or "rameshkrthakur1816@gmail.com"
            setting.smtp_password = file_creds.get("smtp_password")
            setting.api_key = file_creds.get("api_key")
            setting.from_name = file_creds.get("from_name", "Ramesh Kumar Thakur | OM Enterprise")
            setting.from_email = file_creds.get("from_email") or current_user.email or "rameshkrthakur1816@gmail.com"
            setting.use_tls = file_creds.get("use_tls", True)
            setting.use_ssl = file_creds.get("use_ssl", False)
            setting.is_verified = True
            db.commit()
            db.refresh(setting)
            has_creds = True

    # Fallback 3: Check environment variables
    if not has_creds and settings.SMTP_USER and settings.SMTP_PASSWORD:
        if not setting:
            setting = EmailSetting(user_id=current_user.id)
            db.add(setting)
        setting.provider = "gmail"
        setting.smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
        setting.smtp_port = settings.SMTP_PORT or 587
        setting.smtp_user = settings.SMTP_USER
        setting.smtp_password = settings.SMTP_PASSWORD
        setting.from_name = settings.SMTP_FROM_NAME or "Ramesh Kumar Thakur | OM Enterprise"
        setting.from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        setting.use_tls = settings.SMTP_USE_TLS
        setting.use_ssl = settings.SMTP_USE_SSL
        setting.is_verified = True
        db.commit()
        db.refresh(setting)
        has_creds = True

    default_email = current_user.email or "rameshkrthakur1816@gmail.com"
    if setting:
        return EmailSettingResponse(
            id=setting.id,
            user_id=setting.user_id,
            provider=setting.provider or "gmail",
            smtp_host=setting.smtp_host or "smtp.gmail.com",
            smtp_port=setting.smtp_port or 587,
            smtp_user=setting.smtp_user or default_email,
            from_name=setting.from_name or "Ramesh Kumar Thakur | OM Enterprise",
            from_email=setting.from_email or setting.smtp_user or default_email,
            use_tls=setting.use_tls if setting.use_tls is not None else True,
            use_ssl=setting.use_ssl if setting.use_ssl is not None else False,
            is_verified=True if has_creds else bool(setting.is_verified),
            has_password=bool(setting.smtp_password),
            masked_password=mask_password(setting.smtp_password),
            api_key=setting.api_key,
            has_api_key=bool(setting.api_key),
            created_at=setting.created_at,
            updated_at=setting.updated_at
        )

    # Default unconfigured response
    return EmailSettingResponse(
        id=None,
        user_id=current_user.id,
        provider="gmail",
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        smtp_user=default_email,
        from_name="Ramesh Kumar Thakur | OM Enterprise",
        from_email=default_email,
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

    default_personal_email = current_user.email or "rameshkrthakur1816@gmail.com"
    setting.provider = payload.provider or "gmail"
    setting.smtp_host = payload.smtp_host or "smtp.gmail.com"
    setting.smtp_port = payload.smtp_port or 587
    setting.smtp_user = payload.smtp_user.strip() if payload.smtp_user else default_personal_email
    
    # Update password if provided
    if payload.smtp_password and payload.smtp_password.strip():
        setting.smtp_password = clean_password(payload.smtp_password)

    if payload.api_key and payload.api_key.strip():
        setting.api_key = payload.api_key.strip()

    setting.from_name = payload.from_name.strip() if payload.from_name else "Ramesh Kumar Thakur | OM Enterprise"
    setting.from_email = payload.from_email.strip() if payload.from_email else (payload.smtp_user.strip() if payload.smtp_user else default_personal_email)
    setting.use_tls = payload.use_tls if payload.use_tls is not None else True
    setting.use_ssl = payload.use_ssl if payload.use_ssl is not None else False
    
    # Once saved with credentials, mark as actively verified immediately!
    has_creds = bool(setting.smtp_password or setting.api_key)
    setting.is_verified = True if has_creds else False

    db.commit()
    db.refresh(setting)

    # 1. Permanently persist to disk file store
    save_persistent_email_credentials({
        "provider": setting.provider,
        "smtp_host": setting.smtp_host,
        "smtp_port": setting.smtp_port,
        "smtp_user": setting.smtp_user,
        "smtp_password": setting.smtp_password,
        "api_key": setting.api_key,
        "from_name": setting.from_name,
        "from_email": setting.from_email,
        "use_tls": setting.use_tls,
        "use_ssl": setting.use_ssl,
        "is_verified": setting.is_verified
    })

    # 2. Sync credentials to all other users in database so session switching never loses credentials
    all_other_settings = db.query(EmailSetting).filter(EmailSetting.id != setting.id).all()
    for other in all_other_settings:
        other.provider = setting.provider
        other.smtp_host = setting.smtp_host
        other.smtp_port = setting.smtp_port
        other.smtp_user = setting.smtp_user
        if setting.smtp_password:
            other.smtp_password = setting.smtp_password
        if setting.api_key:
            other.api_key = setting.api_key
        other.from_name = setting.from_name
        other.from_email = setting.from_email
        other.use_tls = setting.use_tls
        other.use_ssl = setting.use_ssl
        other.is_verified = setting.is_verified
    db.commit()

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
