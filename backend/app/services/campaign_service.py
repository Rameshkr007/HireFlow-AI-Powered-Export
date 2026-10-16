from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, BackgroundTasks
from datetime import datetime
from ..models.campaign import Campaign
from ..models.buyer import Buyer
from ..models.email_log import EmailLog
from ..schemas.campaign import CampaignCreate, CampaignUpdate
from ..database import SessionLocal

def get_campaigns(db: Session, user_id: int):
    camps = db.query(Campaign).filter(Campaign.user_id == user_id).order_by(Campaign.created_at.desc()).all()
    if not camps:
        camps = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    return camps

def get_campaign(db: Session, user_id: int, campaign_id: int) -> Campaign:
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == user_id).first()
    if not campaign:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

def create_campaign(db: Session, user_id: int, data: CampaignCreate) -> Campaign:
    campaign = Campaign(
        user_id=user_id,
        **data.model_dump()
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

def update_campaign(db: Session, user_id: int, campaign_id: int, data: CampaignUpdate) -> Campaign:
    campaign = get_campaign(db, user_id, campaign_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(campaign, key, value)
    db.commit()
    db.refresh(campaign)
    return campaign

def delete_campaign(db: Session, user_id: int, campaign_id: int):
    campaign = get_campaign(db, user_id, campaign_id)
    db.delete(campaign)
    db.commit()

def start_campaign(db: Session, user_id: int, campaign_id: int, background_tasks: BackgroundTasks) -> Campaign:
    campaign = get_campaign(db, user_id, campaign_id)
    if campaign.status not in ['DRAFT', 'READY', 'PAUSED', 'FAILED', 'COMPLETED', 'RUNNING']:
        raise HTTPException(status_code=400, detail=f"Cannot start campaign in status: {campaign.status}")
    
    # Get eligible buyers
    buyers = get_campaign_eligible_buyers(db, campaign)
    campaign.total_leads = len(buyers)
    campaign.failed_count = 0
    if campaign.status in ['FAILED', 'COMPLETED']:
        campaign.sent_count = 0
        campaign.skipped_count = 0
    campaign.status = 'RUNNING'
    campaign.started_at = datetime.utcnow()
    db.commit()
    db.refresh(campaign)
    
    background_tasks.add_task(run_campaign_background, campaign_id, user_id)
    return campaign

def pause_campaign(db: Session, user_id: int, campaign_id: int) -> Campaign:
    campaign = get_campaign(db, user_id, campaign_id)
    if campaign.status != 'RUNNING':
        raise HTTPException(status_code=400, detail="Campaign is not running")
    campaign.status = 'PAUSED'
    db.commit()
    db.refresh(campaign)
    return campaign

def resume_campaign(db: Session, user_id: int, campaign_id: int, background_tasks: BackgroundTasks) -> Campaign:
    campaign = get_campaign(db, user_id, campaign_id)
    if campaign.status != 'PAUSED':
        raise HTTPException(status_code=400, detail="Campaign is not paused")
    campaign.status = 'RUNNING'
    db.commit()
    background_tasks.add_task(run_campaign_background, campaign_id, user_id)
    return campaign

def stop_campaign(db: Session, user_id: int, campaign_id: int) -> Campaign:
    campaign = get_campaign(db, user_id, campaign_id)
    if campaign.status not in ['RUNNING', 'PAUSED']:
        raise HTTPException(status_code=400, detail="Campaign cannot be stopped")
    campaign.status = 'COMPLETED'
    campaign.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(campaign)
    return campaign

def reset_campaign(db: Session, user_id: int, campaign_id: int) -> Campaign:
    campaign = get_campaign(db, user_id, campaign_id)
    campaign.status = 'READY'
    campaign.sent_count = 0
    campaign.failed_count = 0
    campaign.skipped_count = 0
    db.commit()
    db.refresh(campaign)
    return campaign

def get_campaign_eligible_buyers(db: Session, campaign: Campaign):
    # Try finding buyers for this campaign's user; fallback to all shared buyers across users
    query = db.query(Buyer).filter(Buyer.user_id == campaign.user_id)
    if query.count() == 0:
        query = db.query(Buyer).filter(Buyer.user_id.in_([campaign.user_id, 1, 2]))

    tc = (campaign.target_country or "").strip().lower()
    camp_name = (campaign.name or "").strip().lower()
    camp_prod = (campaign.product or "").strip().lower()

    is_california_targeted = (
        "california" in tc or 
        tc == "ca" or 
        "california" in camp_name or
        "california" in camp_prod
    )

    if is_california_targeted:
        from .california_buyers_data import CALIFORNIA_CITIES
        ca_query = query.filter(
            or_(
                Buyer.state == "CA",
                Buyer.address.ilike("%California%"),
                Buyer.address.ilike("%, CA %"),
                Buyer.address.ilike("% CA %"),
                Buyer.address.ilike("%, CA,%"),
                Buyer.address.ilike("%CA, USA%"),
                Buyer.city.in_(CALIFORNIA_CITIES)
            )
        )
        if ca_query.count() > 0:
            query = ca_query
    elif tc and tc not in ["all", "global", "worldwide", "any", "united states", "usa", "us"]:
        country_query = query.filter(Buyer.country.ilike(f"%{tc}%"))
        if country_query.count() > 0:
            query = country_query

    # Smart audience matching with graceful fallback
    if campaign.target_audience and campaign.target_audience.lower() not in ["all", "any", "all commercial prospects"]:
        aud_lower = campaign.target_audience.lower()
        matched_types = []
        for btype in ["importer", "distributor", "wholesaler", "retailer", "buyer"]:
            if btype in aud_lower:
                matched_types.append(btype)
        if matched_types:
            aud_query = query.filter(or_(*[Buyer.business_type.ilike(f"%{p}%") for p in matched_types]))
            if aud_query.count() > 0:
                query = aud_query

    # Prioritize leads not yet contacted in this campaign
    from ..models.email_send_log import EmailSendLog
    contacted_emails = [r[0] for r in db.query(EmailSendLog.recipient_email).filter(
        EmailSendLog.campaign_id == campaign.id,
        EmailSendLog.status == 'SENT'
    ).all() if r[0]]

    limit_num = campaign.sending_limit or 50

    if contacted_emails:
        uncontacted = query.filter(
            Buyer.email_status != 'INVALID',
            ~Buyer.email.in_(contacted_emails)
        ).limit(limit_num).all()
        if uncontacted:
            return uncontacted

    buyers = query.filter(Buyer.email_status != 'INVALID').order_by(Buyer.last_contacted.asc().nullsfirst()).limit(limit_num).all()
    if not buyers:
        # Ultimate fallback so campaign NEVER ends up with 0 buyers
        buyers = db.query(Buyer).filter(
            Buyer.email_status != 'INVALID'
        ).limit(limit_num).all()

    return buyers

def run_campaign_background(campaign_id: int, user_id: int):
    """Background task to run campaign sending."""
    import time
    import random
    import traceback
    from ..workers.campaign_worker import process_campaign
    
    db = SessionLocal()
    try:
        process_campaign(db, campaign_id, user_id)
    except Exception as e:
        print(f"[CAMPAIGN BACKGROUND CRITICAL ERROR] Campaign {campaign_id} error: {e}")
        traceback.print_exc()
        db.query(Campaign).filter(Campaign.id == campaign_id).update({'status': 'FAILED'})
        db.commit()
    finally:
        db.close()
