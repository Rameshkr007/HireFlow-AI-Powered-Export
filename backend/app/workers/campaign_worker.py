import time
import random
import re
import os
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from ..models.campaign import Campaign
from ..models.buyer import Buyer
from ..models.email_log import EmailLog
from ..models.email_send_log import EmailSendLog
from ..services.email_validation_service import validate_email_address
from ..services.email_service import send_real_email_for_campaign
from ..services.email_ledger_service import record_and_dispatch_email

DEMO_ERRORS = [
    "Temporary delivery failure",
    "Mailbox full",
    "Connection timeout",
    "Rate limit exceeded",
]

def check_already_contacted(db: Session, campaign_id: int, buyer_email: str) -> bool:
    """Check if buyer email was already contacted (SENT) in this campaign."""
    if not buyer_email:
        return False
    clean_em = buyer_email.lower().strip()
    sl = db.query(EmailSendLog).filter(
        EmailSendLog.campaign_id == campaign_id,
        EmailSendLog.recipient_email == clean_em,
        EmailSendLog.status == 'SENT'
    ).first()
    if sl:
        return True
    existing = db.query(EmailLog).filter(
        EmailLog.campaign_id == campaign_id,
        EmailLog.email_address == clean_em,
        EmailLog.status == 'SENT'
    ).first()
    return existing is not None

def personalize_email_simple(template: str, buyer, fallback_product: str = "", profile=None, user_email: str = "") -> str:
    """Simple placeholder replacement supporting {}, <>, and [] styles."""
    if not template or not template.strip():
        template = """Hello {buyer_name},

I hope this email finds you well.

I am reaching out on behalf of OM Enterprise regarding our handcrafted export collection for {company_name}. We are a direct manufacturer specializing in authentic Himalayan Singing Bowls, home décor, and candle holders.

We offer direct factory FOB pricing, OEM customization, and worldwide freight delivery.

Would you be open to reviewing our wholesale pricing and receiving a sample?

Best regards,
Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065"""
    
    buyer_name = (buyer.buyer_name or 'Sir/Madam').strip()
    company_name = (buyer.company_name or 'your company').strip()
    product = (buyer.product or fallback_product or 'our export products').strip()
    country = (buyer.country or 'your region').strip()
    city = (getattr(buyer, 'city', None) or '').strip()
    state = (getattr(buyer, 'state', None) or '').strip()
    address = (getattr(buyer, 'address', None) or '').strip()
    city_display = f"{city}, {state}" if city and state else (city or country)
    website = (buyer.website or '').strip()

    # Company & Sender details
    p_sender_name = (getattr(profile, 'sender_name', None) or getattr(profile, 'exporter_name', None) or "Ramesh Kumar Thakur").strip()
    p_company_name = (getattr(profile, 'company_name', None) or "OM Enterprise").strip()
    p_company_email = "exportindia2026us@gmail.com"
    p_personal_email = "rameshkrthakur1816@gmail.com"
    p_phone = (getattr(profile, 'phone', None) or "+91 80577 10065").strip()
    p_website = ""  # No company website per user instruction

    result = template

    # Signature contextual replacement: ensure Sales Executive company is ALWAYS OM Enterprise
    result = re.sub(r'Sales Executive\s*(\{\{|\{)?company_name(\}\})?', f'Sales Executive\n{p_company_name}', result, flags=re.IGNORECASE)

    # Clean company website lines from template completely (no website)
    result = re.sub(r'^[ \t]*[🌐]?[ \t]*(?:Website|website)?[:\s]*(?:https?://)?(?:www\.)?omenterprise\.com[^\n]*\n?', '', result, flags=re.MULTILINE | re.IGNORECASE)
    result = re.sub(r'^[ \t]*[🌐]?[ \t]*(?:Website|website)?[:\s]*\{\{website\}\}[^\n]*\n?', '', result, flags=re.MULTILINE | re.IGNORECASE)
    result = re.sub(r'^[ \t]*[🌐]?[ \t]*(?:Website|website)?[:\s]*\{website\}[^\n]*\n?', '', result, flags=re.MULTILINE | re.IGNORECASE)
    result = re.sub(r'^[ \t]*[🌐]?[ \t]*(?:Website|website)?[:\s]*<Website>[^\n]*\n?', '', result, flags=re.MULTILINE | re.IGNORECASE)
    result = re.sub(r'^[ \t]*[🌐][^\n]*\n?', '', result, flags=re.MULTILINE)

    # 1. First Pass: Process all DOUBLE-BRACE placeholders {{...}} first to prevent bracket nesting
    double_brace_replacements = [
        ('{{name}}', buyer_name),
        ('{{buyer_name}}', buyer_name),
        ('{{company}}', company_name),
        ('{{buyer_company}}', company_name),
        ('{{country}}', country),
        ('{{city}}', city or country),
        ('{{state}}', state),
        ('{{address}}', address or city_display),
        ('{{location}}', city_display),
        ('{{product}}', product),
        ('{{product_name}}', product),
        ('{{sender_name}}', p_sender_name),
        ('{{exporter_name}}', p_sender_name),
        ('{{company_name}}', p_company_name),
        ('{{exporter_company}}', p_company_name),
        ('{{email}}', p_personal_email),
        ('{{sender_email}}', p_personal_email),
        ('{{personal_email}}', p_personal_email),
        ('{{reply_to}}', p_personal_email),
        ('{{reply_to_email}}', p_personal_email),
        ('{{company_email}}', p_company_email),
        ('{{phone}}', p_phone),
        ('{{website}}', p_website),
    ]
    for placeholder, val in double_brace_replacements:
        result = result.replace(placeholder, val)

    # 2. Second Pass: Process single-brace {}, <>, and [] placeholders
    single_replacements = {
        '{buyer_name}': buyer_name,
        '{Buyer Name}': buyer_name,
        '{name}': buyer_name,
        '{company_name}': company_name,
        '{Company Name}': company_name,
        '{company}': company_name,
        '{product}': product,
        '{Product}': product,
        '{product_name}': product,
        '{Product Name}': product,
        '{country}': country,
        '{Country}': country,
        '{city}': city or country,
        '{City}': city or country,
        '{state}': state,
        '{State}': state,
        '{address}': address or city_display,
        '{Address}': address or city_display,
        '{client_address}': address or city_display,
        '{buyer_address}': address or city_display,
        '{location}': city_display,
        '{website}': '',
        '{Website}': '',
        '{sender_name}': p_sender_name,
        '{exporter_name}': p_sender_name,
        '{exporter_company}': p_company_name,
        '{sender_email}': p_personal_email,
        '{personal_email}': p_personal_email,
        '{reply_to}': p_personal_email,
        '{email}': p_personal_email,
        '{company_email}': p_company_email,
        '{phone}': p_phone,
        # Brackets []
        '[Buyer Name]': buyer_name,
        '[buyer_name]': buyer_name,
        '[Company Name]': company_name,
        '[company_name]': company_name,
        '[Product]': product,
        '[Product Name]': product,
        '[Country]': country,
        '[City]': city or country,
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
        '<City>': city or country,
        '<Website>': '',
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
    for placeholder, value in single_replacements.items():
        result = result.replace(placeholder, value)

    return result

def process_campaign(db: Session, campaign_id: int, user_id: int):
    """Main campaign processing function - runs in background."""
    if campaign_id == 7:
        from ..services.campaign_service import ensure_campaign_7
        ensure_campaign_7(db, user_id)
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

    # Resolve attachment files & names for dispatching & logging
    from ..services.email_service import parse_attachment_ids, DEFAULT_POSTER_PATH
    attachment_list = []
    att_names = []
    target_ids = []
    target_ids.extend(parse_attachment_ids(getattr(campaign, "attachment_ids", None)))
    if getattr(campaign, "attachment_id", None) and campaign.attachment_id not in target_ids:
        target_ids.append(campaign.attachment_id)
    # If campaign explicitly selected attachments, load them.
    # If no attachments were selected, keep attachment_list empty for 100% clean inbox placement (Safe Cold Outreach Mode).
    if target_ids:
        atts = db.query(Attachment).filter(Attachment.id.in_(target_ids)).all()
        for att in atts:
            if att.file_path and os.path.exists(att.file_path):
                attachment_list.append({
                    "path": att.file_path,
                    "name": att.original_name or os.path.basename(att.file_path)
                })
        att_names = [a.original_name for a in atts if a.original_name]
    elif campaign_id in [6, 8, 9, 10]:
        # Legacy poster flyer campaigns
        from ..services.email_service import get_default_poster_items
        attachment_list = get_default_poster_items()
        att_names = [item["name"] for item in attachment_list]
    else:
        # Safe High-Deliverability Mode: Zero attachments on cold initial touch
        attachment_list = []
        att_names = []

    attachment_name_str = ", ".join(att_names) if att_names else None
    first_path = attachment_list[0]["path"] if attachment_list else None
    first_name = attachment_list[0]["name"] if attachment_list else attachment_name_str

    initial_sent = campaign.sent_count or 0
    initial_failed = campaign.failed_count or 0
    initial_skipped = campaign.skipped_count or 0
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
            campaign.skipped_count = initial_skipped + skipped
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
            campaign.skipped_count = initial_skipped + skipped
            db.commit()
            continue

        # 3. Check already contacted in this campaign
        if check_already_contacted(db, campaign_id, buyer.email):
            log = EmailLog(
                campaign_id=campaign_id,
                buyer_id=buyer.id,
                user_id=user_id,
                email_address=buyer.email,
                subject=campaign.email_subject,
                personalized_body="",
                status='ALREADY_CONTACTED',
                error_message='This buyer was already contacted in this campaign'
            )
            db.add(log)
            skipped += 1
            campaign.skipped_count = initial_skipped + skipped
            db.commit()
            continue

        # 4. Personalize subject and body
        personalized_subject = personalize_email_simple(campaign.email_subject or "Export Partnership Opportunity", buyer, campaign.product or "", profile=profile, user_email=user_email_str)
        personalized_body = personalize_email_simple(campaign.email_body or "", buyer, campaign.product or "", profile=profile, user_email=user_email_str)

        # 5. Canonical Database Ledger Send & Dispatch
        try:
            op_id = f"op_camp_{campaign_id}_{buyer.id}_{uuid.uuid4().hex[:12]}"
            send_log, send_success, send_err = record_and_dispatch_email(
                db=db,
                user_id=user_id,
                recipient_email=buyer.email,
                subject=personalized_subject,
                body_text=personalized_body,
                buyer_id=buyer.id,
                campaign_id=campaign_id,
                operation_id=op_id,
                attachment_name=first_name,
                attachment_path=first_path,
                attachment_list=attachment_list,
                is_demo=campaign.is_demo
            )

            if send_success:
                sent += 1
            else:
                failed += 1
        except Exception as dispatch_exc:
            print(f"[CAMPAIGN DISPATCH ERROR] Handled dispatch notice for buyer {buyer.id} ({buyer.email}): {dispatch_exc}")
            failed += 1
            try:
                db.rollback()
            except Exception:
                pass

        # Update campaign counts
        try:
            campaign.sent_count = initial_sent + sent
            campaign.failed_count = initial_failed + failed
            campaign.skipped_count = initial_skipped + skipped
            db.commit()
        except Exception:
            db.rollback()

        # Delay between sends (responsive 1-2s pacing)
        delay = min(campaign.delay_seconds or 2, 2)
        time.sleep(delay)

    # Mark campaign completed
    db.refresh(campaign)
    if campaign.status == 'RUNNING':
        campaign.status = 'COMPLETED'
        campaign.completed_at = datetime.utcnow()
    campaign.sent_count = initial_sent + sent
    campaign.failed_count = initial_failed + failed
    campaign.skipped_count = initial_skipped + skipped
    db.commit()
