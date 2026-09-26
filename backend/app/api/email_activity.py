from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..services.auth_service import get_current_user
from ..models.user import User
from ..models.email_log import EmailLog
from ..models.buyer import Buyer
from ..models.campaign import Campaign

router = APIRouter(prefix="/api/email-activity", tags=["email-activity"])

@router.get("")
def get_email_activity(
    campaign_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(EmailLog).filter(EmailLog.user_id == current_user.id)
    if campaign_id:
        query = query.filter(EmailLog.campaign_id == campaign_id)
    if status:
        query = query.filter(EmailLog.status == status)
    logs = query.order_by(EmailLog.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for log in logs:
        entry = {
            "id": log.id,
            "campaign_id": log.campaign_id,
            "buyer_id": log.buyer_id,
            "email_address": log.email_address,
            "subject": log.subject,
            "status": log.status,
            "error_message": log.error_message,
            "sent_at": str(log.sent_at) if log.sent_at else None,
            "created_at": str(log.created_at) if log.created_at else None,
            "buyer_name": None,
            "company_name": None,
            "country": None,
            "campaign_name": None
        }
        if log.buyer_id:
            buyer = db.query(Buyer).filter(Buyer.id == log.buyer_id).first()
            if buyer:
                entry["buyer_name"] = buyer.buyer_name
                entry["company_name"] = buyer.company_name
                entry["country"] = buyer.country
        camp = db.query(Campaign).filter(Campaign.id == log.campaign_id).first()
        if camp:
            entry["campaign_name"] = camp.name
        result.append(entry)
    return result
