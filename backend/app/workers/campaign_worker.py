import time
import random
import re
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

def personalize_email_simple(template: str, buyer, fallback_product: str = "", profile=None, user_email: str = "") -> str:
    """Simple placeholder replacement supporting {}, <>, and [] styles."""
    if not template:
        return ""
    
    buyer_name = (buyer.buyer_name or 'Sir/Madam').strip()
    company_name = (buyer.company_name or 'your company').strip()
    product = (buyer.product or fallback_product or 'our export products').strip()
    country = (buyer.country or 'your region').strip()
    city = (getattr(buyer, 'city', None) or '').strip()
    state = (getattr(buyer, 'state', None) or '').strip()
    address = (getattr(buyer, 'address', None) or '').strip()
    city_display = f"{city}, {state}" if city and state else (city or country)
    website = (buyer.website or '').strip()

    # Company & Sender details (Sender uses personal email, Description uses official company email)
    p_sender_name = (getattr(profile, 'sender_name', None) or getattr(profile, 'exporter_name', None) or "Ramesh Kumar Thakur").strip()
    p_company_name = (getattr(profile, 'company_name', None) or "OM Enterprise").strip()
    p_company_email = (getattr(profile, 'company_email', None) or "exportindia2026us@gmail.com").strip()
    p_personal_email = (user_email or "rameshkrthakur1816@gmail.com").strip()
    p_phone = (getattr(profile, 'phone', None) or "+91 80577 10065").strip()
    p_website = (getattr(profile, 'website', None) or "").strip()

    # Clean company website lines from template if no company website is available
    if not p_website:
        template = re.sub(r'^[ \t]*[🌐]?[ \t]*(?:Website|website)?[:\s]*(?:https?://)?(?:www\.)?omenterprise\.com[^\n]*\n?', '', template, flags=re.MULTILINE | re.IGNORECASE)
        template = re.sub(r'^[ \t]*[🌐]?[ \t]*(?:Website|website)?[:\s]*\{\{website\}\}[^\n]*\n?', '', template, flags=re.MULTILINE | re.IGNORECASE)
        template = re.sub(r'^[ \t]*[🌐]?[ \t]*(?:Website|website)?[:\s]*\{website\}[^\n]*\n?', '', template, flags=re.MULTILINE | re.IGNORECASE)
        template = re.sub(r'^[ \t]*[🌐]?[ \t]*(?:Website|website)?[:\s]*<Website>[^\n]*\n?', '', template, flags=re.MULTILINE | re.IGNORECASE)

    replacements = {
        # Braces {}
        '{buyer_name}': buyer_name,
        '{Buyer Name}': buyer_name,
        '{name}': buyer_name,
        '{{buyer_name}}': buyer_name,
        '{{name}}': buyer_name,
        '{company_name}': company_name,
        '{Company Name}': company_name,
        '{company}': company_name,
        '{{company_name}}': company_name,
        '{{company}}': company_name,
        '{product}': product,
        '{Product}': product,
        '{product_name}': product,
        '{Product Name}': product,
        '{{product}}': product,
        '{country}': country,
        '{Country}': country,
        '{{country}}': country,
        '{city}': city or country,
        '{City}': city or country,
        '{{city}}': city or country,
        '{state}': state,
        '{State}': state,
        '{{state}}': state,
        '{address}': address or city_display,
        '{Address}': address or city_display,
        '{client_address}': address or city_display,
        '{buyer_address}': address or city_display,
        '{{address}}': address or city_display,
        '{location}': city_display,
        '{{location}}': city_display,
        '{website}': website,
        '{Website}': website,
        '{{website}}': p_website,
        # Sender & Company Profile Replacements
        '{sender_name}': p_sender_name,
        '{{sender_name}}': p_sender_name,
        '{exporter_name}': p_sender_name,
        '{{exporter_name}}': p_sender_name,
        '{exporter_company}': p_company_name,
        '{{exporter_company}}': p_company_name,
        '{sender_email}': p_personal_email,
        '{{sender_email}}': p_personal_email,
        '{email}': p_personal_email,
        '{{email}}': p_personal_email,
        '{company_email}': p_company_email,
        '{{company_email}}': p_company_email,
        '{phone}': p_phone,
        '{{phone}}': p_phone,
        # Brackets []
        '[Buyer Name]': buyer_name,
        '[buyer_name]': buyer_name,
        '[Company Name]': company_name,
        '[company_name]': company_name,
        '[Product]': product,
        '[Product Name]': product,
        '[Country]': country,
        '[Sender Name]': p_sender_name,
        '[Company Email]': p_company_email,
        '[Personal Email]': p_personal_email,
        '[Phone]': p_phone,
        # HTML tags <>
        '<Buyer Name>': buyer_name,
        '<buyer_name>': buyer_name,
        '<Company Name>': company_name,
        '<company_name>': company_name,
        '<Product Name>': product,
        '<product>': product,
        '<Country>': country,
        '<Website>': website,
        '<Company Email>': p_company_email,
        '<Sender Name>': p_sender_name,
        '<Phone>': p_phone,
        'Dear Sir/Madam': f"Dear {buyer_name}",
        'Contact Name:': f'Contact Name: {buyer_name}',
        'Company Name:': f'Company Name: {company_name}',
        'Country:': f'Country: {country}',
        'Website:': f'Website: {website}' if website else '',
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

    from ..services.campaign_service import get_campaign_eligible_buyers
    from ..models.attachment import Attachment
    from ..models.exporter_profile import ExporterProfile
    from ..models.user import User

    # Fetch user & profile for personalizations
    user = db.query(User).filter(User.id == user_id).first()
    user_email_str = user.email if user else "rameshkrthakur1816@gmail.com"
    profile = db.query(ExporterProfile).filter(ExporterProfile.user_id == user_id).first()

    # Get eligible buyers with smart US matching and quota fallback
    buyers = get_campaign_eligible_buyers(db, campaign)

    # Resolve attachment names for logging
    att_names = []
    target_ids = []
    if getattr(campaign, "attachment_ids", None):
        target_ids.extend([int(aid) for aid in campaign.attachment_ids if aid])
    if getattr(campaign, "attachment_id", None) and campaign.attachment_id not in target_ids:
        target_ids.append(campaign.attachment_id)
    if target_ids:
        atts = db.query(Attachment).filter(Attachment.id.in_(target_ids)).all()
        att_names = [a.original_name for a in atts if a.original_name]
    attachment_name_str = ", ".join(att_names) if att_names else None

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

        # 4. Personalize subject and body
        personalized_subject = personalize_email_simple(campaign.email_subject or "Export Partnership Opportunity", buyer, campaign.product or "", profile=profile, user_email=user_email_str)
        personalized_body = personalize_email_simple(campaign.email_body or "", buyer, campaign.product or "", profile=profile, user_email=user_email_str)

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
                subject=personalized_subject,
                personalized_body=personalized_body,
                status=status,
                error_message=error,
                attachment_name=attachment_name_str,
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
                db=db,
                personalized_subject=personalized_subject
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
                subject=personalized_subject,
                personalized_body=personalized_body,
                status=status,
                error_message=error,
                attachment_name=attachment_name_str,
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
