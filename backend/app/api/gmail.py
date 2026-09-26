from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.auth_service import get_current_user
from ..services.gmail_service import get_gmail_auth_url, get_gmail_status, disconnect_gmail
from ..models.user import User

router = APIRouter(prefix="/api/gmail", tags=["gmail"])

@router.get("/status")
def gmail_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_gmail_status(db, current_user.id)

@router.get("/connect")
def gmail_connect(current_user: User = Depends(get_current_user)):
    auth_url = get_gmail_auth_url(current_user.id)
    if not auth_url:
        return {
            "auth_url": "",
            "message": "Gmail OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable real Gmail sending. Demo mode works without this."
        }
    return {"auth_url": auth_url}

@router.delete("/disconnect")
def gmail_disconnect(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    disconnect_gmail(db, current_user.id)
    return {"success": True}
