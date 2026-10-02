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
    user_buyers = db.query(Buyer).filter(Buyer.user_id == uid).all()
    all_buyers = db.query(Buyer).all()
    buyers = user_buyers if len(user_buyers) >= len(all_buyers) else all_buyers

    user_campaigns = db.query(Campaign).filter(Campaign.user_id == uid).all()
    all_campaigns = db.query(Campaign).all()
    campaigns = user_campaigns if len(user_campaigns) >= len(all_campaigns) else all_campaigns

    user_logs = db.query(EmailLog).filter(EmailLog.user_id == uid).all()
    all_logs = db.query(EmailLog).all()
    logs = user_logs if len(user_logs) >= len(all_logs) else all_logs

    sent_from_logs = sum(1 for l in logs if l.status == 'SENT')
    sent_from_camps = sum(c.sent_count for c in campaigns)
    emails_sent = max(sent_from_logs, sent_from_camps)

    failed_from_logs = sum(1 for l in logs if l.status == 'FAILED')
    failed_from_camps = sum(c.failed_count for c in campaigns)
    emails_failed = max(failed_from_logs, failed_from_camps)

    skipped_from_logs = sum(1 for l in logs if l.status in ['SKIPPED', 'ALREADY_CONTACTED', 'INVALID_EMAIL'])
    skipped_from_camps = sum(c.skipped_count for c in campaigns)
    emails_skipped = max(skipped_from_logs, skipped_from_camps)

    return {
        "total_buyers": len(buyers),
        "valid_emails": sum(1 for b in buyers if b.email_status == 'VALID'),
        "invalid_emails": sum(1 for b in buyers if b.email_status == 'INVALID'),
        "high_priority": sum(1 for b in buyers if b.ai_priority == 'HIGH'),
        "medium_priority": sum(1 for b in buyers if b.ai_priority == 'MEDIUM'),
        "low_priority": sum(1 for b in buyers if b.ai_priority == 'LOW'),
        "emails_sent": emails_sent,
        "emails_failed": emails_failed,
        "emails_skipped": emails_skipped,
        "total_campaigns": len(campaigns),
        "active_campaigns": sum(1 for c in campaigns if c.status == 'RUNNING'),
        "completed_campaigns": sum(1 for c in campaigns if c.status == 'COMPLETED'),
    }

@router.get("/charts")
def get_charts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = current_user.id
    user_buyers = db.query(Buyer).filter(Buyer.user_id == uid).all()
    all_buyers = db.query(Buyer).all()
    buyers = user_buyers if len(user_buyers) >= len(all_buyers) else all_buyers

    user_campaigns = db.query(Campaign).filter(Campaign.user_id == uid).all()
    all_campaigns = db.query(Campaign).all()
    campaigns = user_campaigns if len(user_campaigns) >= len(all_campaigns) else all_campaigns

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
