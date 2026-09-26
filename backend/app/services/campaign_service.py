from sqlalchemy.orm import Session
from fastapi import HTTPException, BackgroundTasks
from datetime import datetime
from ..models.campaign import Campaign
from ..models.buyer import Buyer
from ..models.email_log import EmailLog
from ..schemas.campaign import CampaignCreate, CampaignUpdate
from ..database import SessionLocal

def get_campaigns(db: Session, user_id: int):
    return db.query(Campaign).filter(Campaign.user_id == user_id).order_by(Campaign.created_at.desc()).all()

def get_campaign(db: Session, user_id: int, campaign_id: int) -> Campaign:
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == user_id).first()
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
    if campaign.status not in ['DRAFT', 'READY', 'PAUSED']:
        raise HTTPException(status_code=400, detail=f"Cannot start campaign in status: {campaign.status}")
    
    # Get eligible buyers
    buyers = get_campaign_eligible_buyers(db, campaign)
    campaign.total_leads = len(buyers)
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

def get_campaign_eligible_buyers(db: Session, campaign: Campaign):
    query = db.query(Buyer).filter(Buyer.user_id == campaign.user_id)
    if campaign.target_country:
        query = query.filter(Buyer.country.ilike(f"%{campaign.target_country}%"))
    if campaign.target_audience:
        query = query.filter(Buyer.business_type.ilike(f"%{campaign.target_audience}%"))
    buyers = query.filter(Buyer.email_status != 'INVALID').limit(campaign.sending_limit).all()
    return buyers

def run_campaign_background(campaign_id: int, user_id: int):
    """Background task to run campaign sending."""
    import time
    import random
    from ..workers.campaign_worker import process_campaign
    
    db = SessionLocal()
    try:
        process_campaign(db, campaign_id, user_id)
    except Exception as e:
        db.query(Campaign).filter(Campaign.id == campaign_id).update({'status': 'FAILED'})
        db.commit()
    finally:
        db.close()
