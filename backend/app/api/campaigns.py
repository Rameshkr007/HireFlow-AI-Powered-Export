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

@router.post("/{campaign_id}/reset", response_model=CampaignResponse)
def reset_campaign(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return campaign_service.reset_campaign(db, current_user.id, campaign_id)

@router.get("/{campaign_id}/logs")
def get_campaign_logs(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        campaign_service.get_campaign(db, current_user.id, campaign_id)
    except Exception:
        pass

    result = []
    seen_emails = set()

    # 1. Primary Source: EmailSendLog permanent ledger
    try:
        from ..models.email_send_log import EmailSendLog
        send_logs = db.query(EmailSendLog).filter(EmailSendLog.campaign_id == campaign_id).order_by(EmailSendLog.created_at.desc()).all()
        if send_logs:
            all_buyers = db.query(Buyer).all()
            buyers_by_id = {b.id: b for b in all_buyers if b and getattr(b, "id", None) is not None}
            buyers_by_email = {b.normalized_email: b for b in all_buyers if b and getattr(b, "normalized_email", None)}
            
            for idx, sl in enumerate(send_logs):
                if not sl:
                    continue
                sl_id = getattr(sl, "id", None) or (idx + 1)
                rec_email = (getattr(sl, "recipient_email", None) or "").strip()
                norm_em = rec_email.lower()
                buyer_id_val = getattr(sl, "buyer_id", None)
                buyer = buyers_by_email.get(norm_em) or (buyers_by_id.get(buyer_id_val) if buyer_id_val else None)
                
                result.append({
                    "id": sl_id,
                    "campaign_id": getattr(sl, "campaign_id", None) or campaign_id,
                    "buyer_id": buyer_id_val,
                    "user_id": getattr(sl, "user_id", None),
                    "email_address": rec_email,
                    "subject": getattr(sl, "subject", "") or "Wholesale Opportunity",
                    "status": getattr(sl, "status", "SENT") or "SENT",
                    "error_message": getattr(sl, "error_message", None),
                    "attachment_name": getattr(sl, "attachment_name", None),
                    "sent_at": str(sl.sent_at) if getattr(sl, "sent_at", None) else None,
                    "created_at": str(sl.created_at) if getattr(sl, "created_at", None) else None,
                    "buyer_name": (buyer.buyer_name if buyer else getattr(sl, "recipient_name", None)) or "Purchasing Lead",
                    "company_name": (buyer.company_name if buyer else getattr(sl, "company_name", None)) or "Enterprise Buyer",
                    "country": (buyer.country if buyer else "USA") or "USA"
                })
                if norm_em:
                    seen_emails.add(norm_em)
            if result:
                return result
    except Exception as e:
        print(f"[get_campaign_logs] Handled send_logs exception: {e}")

    # 2. Secondary Fallback: EmailLog legacy logs
    try:
        logs = db.query(EmailLog).filter(EmailLog.campaign_id == campaign_id).order_by(EmailLog.created_at.desc()).all()
        if logs:
            all_buyers = db.query(Buyer).all()
            buyers_by_id = {b.id: b for b in all_buyers if b and getattr(b, "id", None) is not None}
            buyers_by_email = {b.normalized_email: b for b in all_buyers if b and getattr(b, "normalized_email", None)}
            
            for idx, log in enumerate(logs):
                if not log:
                    continue
                log_id = getattr(log, "id", None) or (idx + 1)
                rec_email = (getattr(log, "email_address", None) or "").strip()
                norm_em = rec_email.lower()
                buyer_id_val = getattr(log, "buyer_id", None)
                buyer = buyers_by_email.get(norm_em) or (buyers_by_id.get(buyer_id_val) if buyer_id_val else None)
                
                result.append({
                    "id": log_id,
                    "campaign_id": getattr(log, "campaign_id", None) or campaign_id,
                    "buyer_id": buyer_id_val,
                    "user_id": getattr(log, "user_id", None),
                    "email_address": rec_email,
                    "subject": getattr(log, "subject", "") or "Wholesale Opportunity",
                    "status": getattr(log, "status", "SENT") or "SENT",
                    "error_message": getattr(log, "error_message", None),
                    "attachment_name": getattr(log, "attachment_name", None),
                    "sent_at": str(log.sent_at) if getattr(log, "sent_at", None) else None,
                    "created_at": str(log.created_at) if getattr(log, "created_at", None) else None,
                    "buyer_name": (buyer.buyer_name if buyer else None) or "Purchasing Lead",
                    "company_name": (buyer.company_name if buyer else None) or "Enterprise Buyer",
                    "country": (buyer.country if buyer else "USA") or "USA"
                })
    except Exception as e:
        print(f"[get_campaign_logs] Handled logs exception: {e}")

    return result
