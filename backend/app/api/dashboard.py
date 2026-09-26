from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import Counter
from ..database import get_db
from ..services.auth_service import get_current_user
from ..models.user import User
from ..models.buyer import Buyer
from ..models.campaign import Campaign
from ..models.email_log import EmailLog

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.id
    buyers = db.query(Buyer).filter(Buyer.user_id == uid).all()
    campaigns = db.query(Campaign).filter(Campaign.user_id == uid).all()
    logs = db.query(EmailLog).filter(EmailLog.user_id == uid).all()
    return {
        "total_buyers": len(buyers),
        "valid_emails": sum(1 for b in buyers if b.email_status == 'VALID'),
        "invalid_emails": sum(1 for b in buyers if b.email_status == 'INVALID'),
        "high_priority": sum(1 for b in buyers if b.ai_priority == 'HIGH'),
        "medium_priority": sum(1 for b in buyers if b.ai_priority == 'MEDIUM'),
        "low_priority": sum(1 for b in buyers if b.ai_priority == 'LOW'),
        "emails_sent": sum(1 for l in logs if l.status == 'SENT'),
        "emails_failed": sum(1 for l in logs if l.status == 'FAILED'),
        "emails_skipped": sum(1 for l in logs if l.status in ['SKIPPED', 'ALREADY_CONTACTED', 'INVALID_EMAIL']),
        "total_campaigns": len(campaigns),
        "active_campaigns": sum(1 for c in campaigns if c.status == 'RUNNING'),
        "completed_campaigns": sum(1 for c in campaigns if c.status == 'COMPLETED'),
    }

@router.get("/charts")
def get_charts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.id
    buyers = db.query(Buyer).filter(Buyer.user_id == uid).all()
    campaigns = db.query(Campaign).filter(Campaign.user_id == uid).all()
    by_country = dict(Counter(b.country for b in buyers if b.country))
    by_type = dict(Counter(b.business_type for b in buyers if b.business_type))
    by_priority = dict(Counter(b.ai_priority for b in buyers if b.ai_priority))
    campaign_perf = [
        {"name": c.name[:20], "sent": c.sent_count, "failed": c.failed_count, "skipped": c.skipped_count}
        for c in campaigns[-5:]
    ]
    return {
        "by_country": [{"country": k, "count": v} for k, v in sorted(by_country.items(), key=lambda x: -x[1])[:10]],
        "by_business_type": [{"type": k, "count": v} for k, v in by_type.items()],
        "by_priority": [{"priority": k, "count": v} for k, v in by_priority.items()],
        "campaign_performance": campaign_perf
    }
