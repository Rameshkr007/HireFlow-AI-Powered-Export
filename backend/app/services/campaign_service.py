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
    
    tc = (campaign.target_country or "").strip().lower()
    camp_name = (campaign.name or "").strip().lower()
    camp_prod = (campaign.product or "").strip().lower()
    
    is_california_targeted = (
        "california" in tc or 
        tc == "ca" or 
        "usa - california" in tc or 
        "california, usa" in tc or
        "california" in camp_name or
        "california" in camp_prod
    )
    
    if is_california_targeted:
        from .california_buyers_data import CALIFORNIA_CITIES
        query = query.filter(
            or_(
                Buyer.state == "CA",
                and_(
                    or_(
                        Buyer.address.ilike("%California%"),
                        Buyer.address.ilike("%, CA %"),
                        Buyer.address.ilike("% CA %"),
                        Buyer.address.ilike("%, CA,%"),
                        Buyer.address.ilike("%CA, USA%")
                    ),
                    or_(Buyer.state == "CA", Buyer.state.is_(None), Buyer.state == "")
                ),
                and_(
                    Buyer.city.in_(CALIFORNIA_CITIES),
                    or_(Buyer.state == "CA", Buyer.state.is_(None), Buyer.state == "")
                )
            ),
            or_(Buyer.state.is_(None), Buyer.state == "", Buyer.state == "CA")
        )
    elif campaign.target_country:
        if tc in ["united states", "usa", "us", "u.s.", "u.s.a."]:
            query = query.filter(
                or_(
                    Buyer.country.ilike("%USA%"),
                    Buyer.country.ilike("%United States%"),
                    Buyer.country.ilike("%US%")
                )
            )
        else:
            query = query.filter(Buyer.country.ilike(f"%{campaign.target_country}%"))
            
    # Smart audience matching
    if campaign.target_audience and campaign.target_audience.lower() not in ["all", "any", "all commercial prospects"]:
        query = query.filter(Buyer.business_type.ilike(f"%{campaign.target_audience}%"))
        
    buyers = query.filter(Buyer.email_status != 'INVALID').limit(campaign.sending_limit).all()
    
    # If strict filter yields fewer than sending_limit, fallback ONLY IF NOT state-specific (never mix outside California)
    if not is_california_targeted and len(buyers) < campaign.sending_limit:
        remaining_limit = campaign.sending_limit - len(buyers)
        existing_ids = [b.id for b in buyers]
        fallback_query = db.query(Buyer).filter(
            Buyer.user_id == campaign.user_id,
            Buyer.email_status != 'INVALID'
        )
        if existing_ids:
            fallback_query = fallback_query.filter(~Buyer.id.in_(existing_ids))
        fallback_buyers = fallback_query.limit(remaining_limit).all()
        buyers.extend(fallback_buyers)
        
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
