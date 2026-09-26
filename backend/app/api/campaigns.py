from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from ..services import campaign_service
from ..services.auth_service import get_current_user
from ..models.user import User
from ..models.email_log import EmailLog
from ..models.buyer import Buyer

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

@router.get("", response_model=List[CampaignResponse])
def list_campaigns(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return campaign_service.get_campaigns(db, current_user.id)

@router.post("", response_model=CampaignResponse)
def create_campaign(data: CampaignCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return campaign_service.create_campaign(db, current_user.id, data)

@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return campaign_service.get_campaign(db, current_user.id, campaign_id)

@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(campaign_id: int, data: CampaignUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return campaign_service.update_campaign(db, current_user.id, campaign_id, data)

@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaign_service.delete_campaign(db, current_user.id, campaign_id)
    return {"success": True}

@router.post("/{campaign_id}/start", response_model=CampaignResponse)
def start_campaign(campaign_id: int, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return campaign_service.start_campaign(db, current_user.id, campaign_id, background_tasks)

@router.post("/{campaign_id}/pause", response_model=CampaignResponse)
def pause_campaign(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return campaign_service.pause_campaign(db, current_user.id, campaign_id)

@router.post("/{campaign_id}/resume", response_model=CampaignResponse)
def resume_campaign(campaign_id: int, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return campaign_service.resume_campaign(db, current_user.id, campaign_id, background_tasks)

@router.post("/{campaign_id}/stop", response_model=CampaignResponse)
def stop_campaign(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return campaign_service.stop_campaign(db, current_user.id, campaign_id)

@router.get("/{campaign_id}/logs")
def get_campaign_logs(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaign_service.get_campaign(db, current_user.id, campaign_id)  # auth check
    logs = db.query(EmailLog).filter(EmailLog.campaign_id == campaign_id).order_by(EmailLog.created_at.desc()).all()
    result = []
    for log in logs:
        entry = {
            "id": log.id,
            "campaign_id": log.campaign_id,
            "buyer_id": log.buyer_id,
            "user_id": log.user_id,
            "email_address": log.email_address,
            "subject": log.subject,
            "status": log.status,
            "error_message": log.error_message,
            "attachment_name": log.attachment_name,
            "sent_at": str(log.sent_at) if log.sent_at else None,
            "created_at": str(log.created_at) if log.created_at else None,
            "buyer_name": None,
            "company_name": None,
            "country": None
        }
        if log.buyer_id:
            buyer = db.query(Buyer).filter(Buyer.id == log.buyer_id).first()
            if buyer:
                entry["buyer_name"] = buyer.buyer_name
                entry["company_name"] = buyer.company_name
                entry["country"] = buyer.country
        result.append(entry)
    return result
