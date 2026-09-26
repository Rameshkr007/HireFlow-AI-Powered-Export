from sqlalchemy.orm import Session
from fastapi import HTTPException
from collections import Counter
from ..models.campaign import Campaign
from ..models.buyer import Buyer
from ..models.email_log import EmailLog
from ..schemas.report import CampaignReportResponse


def generate_campaign_report(db: Session, campaign_id: int, user_id: int) -> CampaignReportResponse:
    """Generate a full report for a campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == user_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    logs = db.query(EmailLog).filter(EmailLog.campaign_id == campaign_id).all()

    # Get buyers for the campaign
    buyers_query = db.query(Buyer).filter(Buyer.user_id == user_id)
    if campaign.target_country:
        buyers_query = buyers_query.filter(Buyer.country.ilike(f"%{campaign.target_country}%"))
    buyers = buyers_query.all()

    # Count by log status
    sent = sum(1 for l in logs if l.status == 'SENT')
    failed = sum(1 for l in logs if l.status == 'FAILED')
    skipped = sum(1 for l in logs if l.status == 'SKIPPED')
    already_contacted = sum(1 for l in logs if l.status == 'ALREADY_CONTACTED')
    invalid_email = sum(1 for l in logs if l.status == 'INVALID_EMAIL')
    valid_contacts = sent + failed  # attempted

    # Count priorities in eligible buyers
    high_priority = sum(1 for b in buyers if b.ai_priority == 'HIGH')
    medium_priority = sum(1 for b in buyers if b.ai_priority == 'MEDIUM')
    low_priority = sum(1 for b in buyers if b.ai_priority == 'LOW')

    # by_country: from email logs matched to buyers
    buyer_ids = [l.buyer_id for l in logs if l.status == 'SENT' and l.buyer_id]
    sent_buyers = db.query(Buyer).filter(Buyer.id.in_(buyer_ids)).all() if buyer_ids else []
    by_country = dict(Counter(b.country for b in sent_buyers if b.country))
    by_business_type = dict(Counter(b.business_type for b in sent_buyers if b.business_type))

    return CampaignReportResponse(
        campaign_id=campaign.id,
        campaign_name=campaign.name,
        product=campaign.product,
        target_country=campaign.target_country,
        total_buyers=campaign.total_leads or len(buyers),
        valid_contacts=valid_contacts,
        invalid_emails=invalid_email,
        duplicates_removed=0,  # tracked at import time
        already_contacted=already_contacted,
        emails_sent=sent,
        emails_failed=failed,
        emails_skipped=skipped + already_contacted + invalid_email,
        high_priority_leads=high_priority,
        medium_priority_leads=medium_priority,
        low_priority_leads=low_priority,
        status=campaign.status,
        started_at=campaign.started_at,
        completed_at=campaign.completed_at,
        by_country=by_country,
        by_business_type=by_business_type
    )
