import os
import json
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..services.auth_service import get_current_user
from ..services.email_service import (
    dispatch_email_universal,
    get_effective_smtp_config,
    format_html_email
)

router = APIRouter(prefix="/api/email-tester", tags=["email-tester"])

TEST_HISTORY_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../services/email_test_history.json")
)

ATTACHMENTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../attachments")
)

# Halloween and default asset paths
HALLOWEEN_POSTER_PATH = os.path.join(ATTACHMENTS_DIR, "OM_Enterprise_Halloween_Special_Offer_Poster.jpg")
HALLOWEEN_BADGE_PATH = os.path.join(ATTACHMENTS_DIR, "OM_Enterprise_Halloween_Special_Offer_Badge.jpg")
HANDCRAFTED_POSTER_PATH = os.path.join(ATTACHMENTS_DIR, "OM_Enterprise_Handcrafted_Pieces_Poster.jpg")
SPECIAL_BADGE_PATH = os.path.join(ATTACHMENTS_DIR, "OM_Enterprise_Special_Offer_Badge.jpg")
CATALOG_PDF_PATH = os.path.join(ATTACHMENTS_DIR, "OM_Enterprise_Metal_Candle_Holder_Catalog.pdf")

def resolve_poster_path() -> str:
    if os.path.exists(HALLOWEEN_POSTER_PATH):
        return HALLOWEEN_POSTER_PATH
    return HANDCRAFTED_POSTER_PATH

def resolve_badge_path() -> str:
    if os.path.exists(HALLOWEEN_BADGE_PATH):
        return HALLOWEEN_BADGE_PATH
    return SPECIAL_BADGE_PATH

AVAILABLE_TEMPLATES = [
    {
        "id": "decor_lanterns_b2b",
        "name": "OM Enterprise – Handcrafted Home Decor & Lanterns (B2B Formal)",
        "category": "Official Outreach",
        "recommended_mode": "text_only",
        "default_attachments": [],
        "subject": "Handcrafted Home Decor & Lanterns – OM Enterprise",
        "body": """Hello,

Greetings from OM Enterprise!

We manufacture handcrafted home décor, metal lanterns, candle holders, and decorative jars.

Are you open to reviewing our product catalog and wholesale export pricing for your store?

Best regards,  
Name: Ramesh Kumar Thakur
OM Enterprise"""
    }
]

SPAM_KEYWORDS = [
    "100% free", "guaranteed", "risk-free", "buy now", "urgent",
    "make money", "winner", "cash bonus", "congratulations", "click here",
    "exclusive offer", "act now", "order now", "no cost", "pure profit",
    "double your", "earn $$$", "miracle", "hidden assets", "special offer",
    "halloween special", "discount", "discounts", "sale", "limited time"
]

def analyze_spam_risk(subject: str, body: str, has_attachments: bool) -> Dict[str, Any]:
    full_text = f"{subject} {body}".lower()
    found_triggers = [kw for kw in SPAM_KEYWORDS if kw in full_text]
    
    score = 100
    score -= len(found_triggers) * 8
    
    # Check for excessive ALL CAPS in subject
    if subject and sum(1 for c in subject if c.isupper()) / max(1, len(subject)) > 0.4:
        score -= 15
        
    # Check for excessive exclamation marks
    if subject.count("!") >= 2:
        score -= 10
        
    # Heavy penalty for image attachments on cold outreach (forces Promotions or Spam tab)
    if has_attachments:
        score -= 22
        
    score = max(35, min(99, score))
    
    if score >= 90:
        placement_prob = "Primary Inbox (95%+ Probability)"
        status_color = "emerald"
    elif score >= 75:
        placement_prob = "Promotions / Updates Tab"
        status_color = "amber"
    else:
        placement_prob = "Spam / Junk Risk"
        status_color = "rose"
        
    tips = []
    if has_attachments:
        tips.append("⚠️ Image attachments (.jpg) detected: Gmail automatically routes cold emails with image flyers into the Promotions tab or Spam folder. Switch to Text-Only Safe Mode for 98%+ Primary Inbox delivery.")
    else:
        tips.append("✅ Text-Only Safe Mode active: Zero image attachments ensures maximum Primary Inbox placement.")
        
    if found_triggers:
        tips.append(f"⚠️ Promotional trigger words detected: {', '.join(found_triggers[:3])}. Commercial buzzwords push cold emails to the Promotions tab. Keep copy conversational and consultative.")
        
    tips.append("💡 Domain Tip: Sending from @gmail.com via Brevo triggers SPF/DMARC mismatch in receiving filters. For 100% Primary Inbox reliability, consider getting a business domain (e.g., @omenterprise.com) with Brevo SPF/DKIM DNS records, or send ultra-short text-only messages.")
    
    return {
        "spam_score": score,
        "placement_probability": placement_prob,
        "status_color": status_color,
        "trigger_words": found_triggers,
        "tips": tips
    }

def load_test_history() -> List[Dict[str, Any]]:
    if not os.path.exists(TEST_HISTORY_FILE):
        return []
    try:
        with open(TEST_HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_test_history(history: List[Dict[str, Any]]):
    try:
        with open(TEST_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[EMAIL TESTER] Warning: Failed to save test history: {e}")

class TestPitchDispatchSchema(BaseModel):
    to_email: str
    template_id: Optional[str] = "decor_lanterns_b2b"
    template_name: Optional[str] = "Handcrafted Home Decor & Lanterns – OM Enterprise"
    subject: str
    body_text: str
    include_attachments: bool = False
    provider: Optional[str] = "gmail"
    app_password: Optional[str] = None
    attachment_keys: Optional[List[str]] = ["halloween_poster", "halloween_badge"]
    buyer_name: Optional[str] = "Marcus Vance"
    company_name: Optional[str] = "Pacific Trade & Living LLC"
    country: Optional[str] = "USA"
    city: Optional[str] = "Los Angeles"
    product: Optional[str] = "Handcrafted Pieces & Singing Bowls"

class PlacementFeedbackSchema(BaseModel):
    test_id: str
    folder_placed: str  # "inbox", "promotions", "spam"
    client_type: Optional[str] = "Gmail"
    notes: Optional[str] = ""

@router.get("/templates")
def get_templates():
    poster_path = resolve_poster_path()
    badge_path = resolve_badge_path()
    return {
        "templates": AVAILABLE_TEMPLATES,
        "available_attachments": [
            {
                "key": "halloween_poster",
                "filename": "OM_Enterprise_Halloween_Special_Offer_Poster.jpg",
                "label": "Halloween Special Offer Poster (JPG - 286 KB)",
                "exists": os.path.exists(poster_path)
            },
            {
                "key": "halloween_badge",
                "filename": "OM_Enterprise_Halloween_Special_Offer_Badge.jpg",
                "label": "Halloween Special Offer Badge (JPG - 167 KB)",
                "exists": os.path.exists(badge_path)
            },
            {
                "key": "catalog",
                "filename": "OM_Enterprise_Metal_Candle_Holder_Catalog.pdf",
                "label": "Metal Candle Holders & Lanterns Catalog (PDF - 502 KB)",
                "exists": os.path.exists(CATALOG_PDF_PATH)
            }
        ]
    }

@router.get("/history")
def get_history(current_user: User = Depends(get_current_user)):
    history = load_test_history()
    user_tests = [item for item in history if item.get("user_id") == current_user.id or not item.get("user_id")]
    return {
        "tests": sorted(user_tests, key=lambda x: x.get("dispatched_at", ""), reverse=True)[:30],
        "total_tests": len(user_tests)
    }

@router.post("/dispatch")
def dispatch_test_pitch(
    payload: TestPitchDispatchSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_email = payload.to_email.strip().lower()
    if not target_email or "@" not in target_email or "." not in target_email:
        raise HTTPException(status_code=400, detail="Please enter a valid recipient email address.")
    
    if target_email.endswith("@gmail."):
        target_email += "com"
    elif target_email.endswith("@gmail"):
        target_email += ".com"

    from ..models.email_setting import EmailSetting
    from ..services.email_service import clean_password
    from ..services.credential_store import save_persistent_email_credentials

    # If user passed app_password directly from testing UI, save and prioritize it immediately
    if payload.app_password and payload.app_password.strip():
        cleaned_p = clean_password(payload.app_password)
        db_s = db.query(EmailSetting).filter(EmailSetting.user_id == current_user.id).first()
        if not db_s:
            db_s = EmailSetting(user_id=current_user.id)
            db.add(db_s)
        db_s.provider = "gmail"
        db_s.smtp_host = "smtp.gmail.com"
        db_s.smtp_port = 587
        db_s.smtp_user = "prt241961@gmail.com"
        db_s.smtp_password = cleaned_p
        db_s.api_key = None
        db_s.from_name = "Ramesh Kumar Thakur | OM Enterprise"
        db_s.from_email = "prt241961@gmail.com"
        db_s.is_verified = True
        db.commit()
        db.refresh(db_s)
        save_persistent_email_credentials({
            "provider": "gmail",
            "smtp_host": "smtp.gmail.com",
            "smtp_port": 587,
            "smtp_user": "prt241961@gmail.com",
            "smtp_password": cleaned_p,
            "api_key": None,
            "from_name": "Ramesh Kumar Thakur | OM Enterprise",
            "from_email": "prt241961@gmail.com",
            "is_verified": True
        })

    smtp_config = get_effective_smtp_config(db, current_user.id)
    if payload.provider == "gmail":
        if not smtp_config or not smtp_config.get("smtp_password"):
            raise HTTPException(
                status_code=400,
                detail="Google App Password is required to send via Gmail SMTP. Please enter your 16-character App Password (e.g. 'abcd efgh ijkl mnop') in the App Password field."
            )
        smtp_config["provider"] = "gmail"
        smtp_config["smtp_host"] = "smtp.gmail.com"
        smtp_config["smtp_port"] = 587
        smtp_config["api_key"] = None
    elif payload.provider == "brevo":
        smtp_config["provider"] = "brevo"
        smtp_config["smtp_host"] = "api.brevo.com"
        smtp_config["smtp_port"] = 443

    if not smtp_config:
        raise HTTPException(
            status_code=400,
            detail="No email credentials found. Please enter your Gmail App Password or Brevo API key."
        )

    # 1. Personalize placeholders
    replacements = {
        "{buyer_name}": payload.buyer_name or "Sir/Madam",
        "{Buyer Name}": payload.buyer_name or "Sir/Madam",
        "<Buyer Name>": payload.buyer_name or "Sir/Madam",
        "{company_name}": payload.company_name or "your company",
        "{Company Name}": payload.company_name or "your company",
        "<Company Name>": payload.company_name or "your company",
        "{country}": payload.country or "USA",
        "{Country}": payload.country or "USA",
        "{city}": payload.city or "Los Angeles",
        "{City}": payload.city or "Los Angeles",
        "{product}": payload.product or "Handcrafted Pieces & Singing Bowls",
        "{Product}": payload.product or "Handcrafted Pieces & Singing Bowls",
        "{state_or_country}": payload.city or "California"
    }

    personalized_subject = payload.subject
    personalized_body = payload.body_text
    for placeholder, val in replacements.items():
        personalized_subject = personalized_subject.replace(placeholder, val)
        personalized_body = personalized_body.replace(placeholder, val)

    # 2. Build attachments list with Halloween assets
    attachment_list = []
    if payload.include_attachments:
        keys = payload.attachment_keys or ["halloween_poster", "halloween_badge"]
        poster_p = resolve_poster_path()
        badge_p = resolve_badge_path()

        if ("halloween_poster" in keys or "poster" in keys) and os.path.exists(poster_p):
            attachment_list.append({
                "path": poster_p,
                "name": "OM_Enterprise_Halloween_Special_Offer_Poster.jpg"
            })
        if ("halloween_badge" in keys or "badge" in keys) and os.path.exists(badge_p):
            attachment_list.append({
                "path": badge_p,
                "name": "OM_Enterprise_Halloween_Special_Offer_Badge.jpg"
            })
        if "catalog" in keys and os.path.exists(CATALOG_PDF_PATH):
            attachment_list.append({
                "path": CATALOG_PDF_PATH,
                "name": "OM_Enterprise_Metal_Candle_Holder_Catalog.pdf"
            })

    first_path = attachment_list[0]["path"] if attachment_list else None
    first_name = attachment_list[0]["name"] if attachment_list else None

    # 3. Analyze Spam Risk
    spam_analysis = analyze_spam_risk(
        personalized_subject,
        personalized_body,
        has_attachments=bool(attachment_list)
    )

    # 4. Universal Dispatch via Brevo HTTP / SMTP
    from_name = smtp_config.get("from_name") or "Ramesh Kumar Thakur | OM Enterprise"
    from_email = smtp_config.get("from_email") or "prt241961@gmail.com"
    reply_to = "prt241961@gmail.com"

    success, error = dispatch_email_universal(
        smtp_config=smtp_config,
        to_email=target_email,
        subject=personalized_subject,
        body_text=personalized_body,
        attachment_path=first_path,
        attachment_filename=first_name,
        attachment_list=attachment_list,
        reply_to=reply_to
    )

    test_id = f"test_{int(datetime.utcnow().timestamp())}"
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+05:30")

    test_record = {
        "id": test_id,
        "user_id": current_user.id,
        "dispatched_at": now_iso,
        "to_email": target_email,
        "template_id": payload.template_id,
        "template_name": payload.template_name or "Halloween Special Offer",
        "subject": personalized_subject,
        "body_preview": personalized_body[:180] + ("..." if len(personalized_body) > 180 else ""),
        "sender_name": from_name,
        "reply_to": reply_to,
        "mode": "with_attachments" if attachment_list else "text_only",
        "attachments_count": len(attachment_list),
        "attachments": [a["name"] for a in attachment_list],
        "provider": smtp_config.get("provider", "brevo"),
        "status": "SENT" if success else "FAILED",
        "error": error if not success else None,
        "folder_placed": "pending_verification",
        "spam_score": spam_analysis["spam_score"],
        "placement_probability": spam_analysis["placement_probability"]
    }

    history = load_test_history()
    history.insert(0, test_record)
    save_test_history(history[:50])

    if not success:
        raise HTTPException(
            status_code=500,
            detail=f"Email dispatch error: {error}"
        )

    return {
        "success": True,
        "message": f"Real test email successfully dispatched to '{target_email}'!",
        "test_id": test_id,
        "target_email": target_email,
        "subject": personalized_subject,
        "mode": test_record["mode"],
        "attachments_sent": test_record["attachments"],
        "spam_analysis": spam_analysis,
        "dispatched_at": now_iso
    }

@router.post("/feedback")
def record_placement_feedback(
    payload: PlacementFeedbackSchema,
    current_user: User = Depends(get_current_user)
):
    history = load_test_history()
    target_item = None
    for item in history:
        if item.get("id") == payload.test_id:
            item["folder_placed"] = payload.folder_placed
            item["client_type"] = payload.client_type or "Gmail"
            item["notes"] = payload.notes or ""
            item["feedback_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+05:30")
            target_item = item
            break

    if target_item:
        save_test_history(history)

    advice = {}
    if payload.folder_placed == "inbox":
        advice = {
            "title": "Success: Email Landed in Primary Inbox 🎉",
            "message": "Your email pitch, headers, and authentication are delivering cleanly to the Primary Inbox. This template is ready for your buyer outreach sequences.",
            "grade": "A+ Primary Inbox Placement",
            "color": "emerald"
        }
    elif payload.folder_placed == "promotions":
        advice = {
            "title": "Categorized in Promotions / Updates Tab 📂",
            "message": "The email bypassed the spam filter, but Google flagged it as commercial marketing. Advice: Remove heavy image posters and send in Text-Only Safe Mode to land directly in the Primary Inbox.",
            "grade": "B Commercial Tab Placement",
            "color": "amber"
        }
    elif payload.folder_placed == "spam":
        advice = {
            "title": "Caution: Email Landed in Spam / Junk Folder ⚠️",
            "message": "Key Action Items: (1) Remove image attachments immediately and use Text-Only mode. (2) Keep the subject line conversational and avoid commercial buzzwords. (3) Reply to this test email to establish direct whitelisting.",
            "grade": "C Spam Filter Triggered",
            "color": "rose"
        }

    return {
        "success": True,
        "test_id": payload.test_id,
        "folder_placed": payload.folder_placed,
        "advice": advice
    }
