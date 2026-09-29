import time
import random
from datetime import datetime
from sqlalchemy.orm import Session
from ..models.campaign import Campaign
from ..models.buyer import Buyer
from ..models.email_log import EmailLog
from ..services.email_validation_service import validate_email_address
from ..services.email_service import send_real_email_for_campaign

DEMO_ERRORS = [
    "Temporary delivery failure",
    "Mailbox full",
    "Connection timeout",
    "Rate limit exceeded",
]

def check_already_contacted(db: Session, buyer_email: str) -> bool:
    """Check if buyer email was already contacted (SENT) in ANY campaign."""
    if not buyer_email:
        return False
    existing = db.query(EmailLog).filter(
        EmailLog.email_address == buyer_email.lower().strip(),
        EmailLog.status == 'SENT'
    ).first()
    return existing is not None

def personalize_email_simple(template: str, buyer) -> str:
    """Simple placeholder replacement without AI."""
    if not template:
        return ""
    replacements = {
        '<Buyer Name>': buyer.buyer_name or 'Sir/Madam',
        '<buyer_name>': buyer.buyer_name or 'Sir/Madam',
        '[Buyer Name]': buyer.buyer_name or 'Sir/Madam',
        'Dear Sir/Madam': f"Dear {buyer.buyer_name or 'Sir/Madam'}",
        '<Company Name>': buyer.company_name or '',
        '<company_name>': buyer.company_name or '',
        '[Company Name]': buyer.company_name or '',
        '<Product Name>': buyer.product or 'our products',
        '[Product]': buyer.product or 'our products',
        '<Country>': buyer.country or '',
        '<Website>': buyer.website or '',
        'Contact Name:': f'Contact Name: {buyer.buyer_name or ""}',
        'Company Name:': f'Company Name: {buyer.company_name or ""}',
        'Country:': f'Country: {buyer.country or ""}',
        'Website:': f'Website: {buyer.website or ""}',
        'Source Platform:': f'Source Platform: {buyer.source_platform or ""}',
    }
    result = template
    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)
    return result

def process_campaign(db: Session, campaign_id: int, user_id: int):
    """Main campaign processing function - runs in background."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        return

    # Get eligible buyers
    buyers_query = db.query(Buyer).filter(Buyer.user_id == user_id)
    
    if campaign.target_country:
        buyers_query = buyers_query.filter(
            Buyer.country.ilike(f"%{campaign.target_country}%")
        )
    if campaign.target_audience:
        buyers_query = buyers_query.filter(
            Buyer.business_type.ilike(f"%{campaign.target_audience}%")
        )
    
    # Don't include buyers with INVALID emails
    buyers_query = buyers_query.filter(Buyer.email_status != 'INVALID')
    buyers = buyers_query.limit(campaign.sending_limit).all()

    sent = 0
    failed = 0
    skipped = 0

    for buyer in buyers:
        # Check campaign status (for pause/stop support)
        db.refresh(campaign)
        if campaign.status in ['PAUSED', 'COMPLETED', 'FAILED']:
            break

        # 1. Check email exists
        if not buyer.email or not buyer.email.strip():
            log = EmailLog(
                campaign_id=campaign_id,
                buyer_id=buyer.id,
                user_id=user_id,
                email_address=buyer.email,
                subject=campaign.email_subject,
                personalized_body="",
                status='INVALID_EMAIL',
                error_message='No email address provided'
            )
            db.add(log)
            skipped += 1
            campaign.skipped_count = skipped
            db.commit()
            continue

        # 2. Validate email
        val_result = validate_email_address(buyer.email)
        if val_result['status'] == 'INVALID':
            log = EmailLog(
                campaign_id=campaign_id,
                buyer_id=buyer.id,
                user_id=user_id,
                email_address=buyer.email,
                subject=campaign.email_subject,
                personalized_body="",
                status='INVALID_EMAIL',
                error_message=val_result.get('reason', 'Invalid email')
            )
            db.add(log)
            skipped += 1
            campaign.skipped_count = skipped
            db.commit()
            continue

        # 3. Check already contacted
        if check_already_contacted(db, buyer.email):
            log = EmailLog(
                campaign_id=campaign_id,
                buyer_id=buyer.id,
                user_id=user_id,
                email_address=buyer.email,
                subject=campaign.email_subject,
                personalized_body="",
                status='ALREADY_CONTACTED',
                error_message='This buyer was already contacted in a previous campaign'
            )
            db.add(log)
            skipped += 1
            campaign.skipped_count = skipped
            db.commit()
            continue

        # 4. Personalize email
        personalized_body = personalize_email_simple(campaign.email_body or "", buyer)

        # 5. Send (demo or real)
        if campaign.is_demo:
            # Demo mode: simulate realistic results
            rand = random.random()
            if rand < 0.82:
                status = 'SENT'
                error = None
                sent += 1
                # Update buyer status
                buyer.outreach_status = 'CONTACTED'
                buyer.last_contacted = datetime.utcnow()
            elif rand < 0.93:
                status = 'FAILED'
                error = random.choice(DEMO_ERRORS)
                failed += 1
            else:
                status = 'SKIPPED'
                error = 'Skipped by campaign filter rules'
                skipped += 1

            log = EmailLog(
                campaign_id=campaign_id,
                buyer_id=buyer.id,
                user_id=user_id,
                email_address=buyer.email,
                subject=campaign.email_subject,
                personalized_body=personalized_body,
                status=status,
                error_message=error,
                sent_at=datetime.utcnow() if status == 'SENT' else None
            )
            db.add(log)
        else:
            # Real mode: Dispatch email via SMTP / Gmail App Password
            success, err_msg = send_real_email_for_campaign(
                campaign=campaign,
                buyer=buyer,
                user_id=user_id,
                personalized_body=personalized_body,
                db=db
            )
            if success:
                status = 'SENT'
                error = None
                sent += 1
                buyer.outreach_status = 'CONTACTED'
                buyer.last_contacted = datetime.utcnow()
            else:
                status = 'FAILED'
                error = err_msg
                failed += 1

            log = EmailLog(
                campaign_id=campaign_id,
                buyer_id=buyer.id,
                user_id=user_id,
                email_address=buyer.email,
                subject=campaign.email_subject,
                personalized_body=personalized_body,
                status=status,
                error_message=error,
                sent_at=datetime.utcnow() if status == 'SENT' else None
            )
            db.add(log)

        # Update campaign counts
        campaign.sent_count = sent
        campaign.failed_count = failed
        campaign.skipped_count = skipped
        db.commit()

        # Delay between sends (capped at 3s in demo mode for UX)
        delay = min(campaign.delay_seconds, 3) if campaign.is_demo else campaign.delay_seconds
        time.sleep(delay)

    # Mark campaign completed
    db.refresh(campaign)
    if campaign.status == 'RUNNING':
        campaign.status = 'COMPLETED'
        campaign.completed_at = datetime.utcnow()
    campaign.sent_count = sent
    campaign.failed_count = failed
    campaign.skipped_count = skipped
    db.commit()
