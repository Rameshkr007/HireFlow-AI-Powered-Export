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
        "id": "halloween_special_offer",
        "name": "Halloween Special Offer – Handcrafted Decor & Singing Bowls (Active Campaign)",
        "category": "Active Campaign",
        "recommended_mode": "with_attachments",
        "default_attachments": ["halloween_poster", "halloween_badge"],
        "subject": "Halloween Special Offer - Handcrafted Decor & Singing Bowls Wholesale",
        "body": """Halloween Special Offer – Handcrafted Pieces & Singing Bowls
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label

Dear {buyer_name},

I hope this email finds you well.

I am reaching out on behalf of OM Enterprise regarding our handcrafted export collection for {company_name}. We are a direct manufacturer specializing in authentic Himalayan Singing Bowls, home décor, lanterns, and metal candle holders.

For the upcoming festive season, we have launched exclusive Halloween & Fall wholesale discounts on our most popular handcrafted pieces.

Our Exclusive Offer:
✔ Direct Factory FOB Pricing (Save 20-30% on Wholesale Orders)
✔ Certified Acoustic Tuning (432Hz / 528Hz) for Singing Bowls
✔ Premium Matte Black, Antique Brass & Hammered Metal Finishes
✔ OEM Custom Engraving & Private Label Packaging
✔ Door-to-Door Air (DHL/FedEx) & Ocean Freight Delivery to California

Our latest Halloween Special Offer catalogue is attached for your review.

Would you be open to receiving our wholesale price list or a complimentary sample piece for quality evaluation?

Kind Regards,

Ramesh Kumar Thakur
Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label"""
    },
    {
        "id": "california_outreach",
        "name": "California Statewide Outreach 2026 (Decor & Bowls)",
        "category": "Cold Outreach",
        "recommended_mode": "text_only",
        "default_attachments": ["halloween_poster", "halloween_badge"],
        "subject": "Quick question regarding {company_name}'s decor & singing bowls sourcing",
        "body": """Hi {buyer_name},

I came across {company_name} while reviewing leading home decor showrooms and wellness businesses across California.

We are a direct manufacturing and export unit based in Nepal, specializing in:
• Handcrafted Metal Candle Stands, Lanterns & Table Candelabras
• Authentic Hand-Hammered Himalayan Singing Bowls & Meditation Sets

Because we produce directly in our manufacturing facility:
1. Pricing is strictly factory-direct FOB (eliminating 20-30% middleman trading margins).
2. We provide custom finishes (matte black, antique bronze, raw brass), laser engraving & private label packaging.
3. Direct consolidated ocean shipments to Los Angeles & Long Beach ports.

Would it make sense to courier a complimentary sample piece to your California office for quality evaluation?

Best regards,

Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp / Phone: +91 80577 10065
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label"""
    },
    {
        "id": "nepal_singing_bowls",
        "name": "Authentic Nepal Himalayan Singing Bowls (Direct FOB)",
        "category": "Cold Outreach",
        "recommended_mode": "text_only",
        "default_attachments": ["halloween_poster", "halloween_badge"],
        "subject": "Authentic Handmade Himalayan Singing Bowls – Direct Manufacturer | Wholesale & OEM",
        "body": """Authentic Handmade Himalayan Singing Bowls
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label

Dear {buyer_name},

While researching leading wellness and meditation businesses in {country}, we came across {company_name} and were very impressed by your product curation.

We are a Nepal-based manufacturer and direct exporter of authentic handmade Himalayan Singing Bowls, crafted by skilled generational artisans using traditional metal-forging techniques.

Our Product Range:
• Handmade Himalayan Singing Bowls & Full Moon Healing Sets
• Antique & Matte Finish Singing Bowls
• 7-Chakra Tuned Singing Bowl Sets (432Hz / 528Hz)
• Meditation & Sound Bath Bowls
• Handcrafted Tingsha Cymbals & Accessories
• Custom Laser Logo & Private Label Manufacturing

Why International Importers Partner With Us:
✔ 100% Direct Manufacturer from Nepal (Direct Factory FOB Pricing)
✔ Traditional 7-Metal Alloy & Certified Acoustic Tuning
✔ OEM, Custom Engraving & Private Label Packaging
✔ Worldwide Door-to-Door (DHL/FedEx) & Ocean Freight Logistics
✔ Dedicated Export Support & Sample Dispatch

Would you like us to send our wholesale price list or courier a sample piece to your office for quality evaluation?

Kind Regards,

Ramesh Kumar Thakur
Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 WhatsApp: +91 80577 10065
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label"""
    },
    {
        "id": "candle_holders",
        "name": "Metal Candle Holders & Lanterns Lookbook Pitch",
        "category": "Cold Outreach",
        "recommended_mode": "text_only",
        "default_attachments": ["catalog"],
        "subject": "Direct factory sourcing for {company_name} – Handcrafted metal candle holders & lanterns",
        "body": """Hi {buyer_name},

I noticed {company_name}'s impressive collection of premium home accents and tabletop accessories.

We are OM Enterprise, a direct manufacturer and exporter of handcrafted metal candle holders, candelabras, and wrought iron lanterns based in Nepal.

How we support US wholesalers & design showrooms:
• Custom OEM designs, private label packaging & barcode retail tagging
• Solid brass, wrought iron, and antique finishes built to export standards
• Factory FOB pricing with low minimum orders for test shipments
• Direct door-to-door express or ocean freight to major US ports (LA & Long Beach)

Our digital lookbook is attached for your review. Would you be open to receiving a physical sample at {company_name} so your team can test our metal finishing firsthand?

Best regards,

Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 +91 80577 10065
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label"""
    },
    {
        "id": "cadence_step1",
        "name": "Cadence Step 1: Initial Cold Introduction",
        "category": "Cadence",
        "recommended_mode": "text_only",
        "default_attachments": [],
        "subject": "Wholesale Himalayan Singing Bowls & Metalware – Direct Nepal Workshop",
        "body": """Hi {buyer_name},

We specialize in direct factory sourcing of authentic hand-hammered 432Hz Himalayan Singing Bowls and handcrafted metal decor from Nepal for US retailers and distributors.

We eliminate intermediary trading costs and provide custom private label packaging.

May I courier a complimentary sample piece to {company_name} this week for evaluation?

Kind Regards,
Ramesh Kumar Thakur
OM Enterprise
📧 rameshkrthakur1816@gmail.com | 📱 +91 80577 10065
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label"""
    },
    {
        "id": "cadence_step2",
        "name": "Cadence Step 2: 3-Day Follow-Up (FOB & Free Sample)",
        "category": "Cadence",
        "recommended_mode": "text_only",
        "default_attachments": [],
        "subject": "Quick follow-up regarding complimentary sample for {company_name}",
        "body": """Hi {buyer_name},

I wanted to quickly follow up on my note regarding our handcrafted metalware and wellness collection for {company_name}.

We have updated our export capacity for this quarter and can offer preferential FOB pricing along with direct shipping to US ports (including Los Angeles / Long Beach).

Can I send over our 2-page wholesale price list and sample request form?

Best regards,

Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com | 📱 +91 80577 10065
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label"""
    },
    {
        "id": "cadence_step3",
        "name": "Cadence Step 3: 7-Day Follow-Up (OEM / Private Label)",
        "category": "Cadence",
        "recommended_mode": "text_only",
        "default_attachments": [],
        "subject": "Private label & custom packaging options for {company_name}",
        "body": """Hi {buyer_name},

I understand you have a demanding procurement schedule. As a direct manufacturer, we also provide complete OEM customization, laser logo engraving, and custom barcode packaging tailored for US retail shelves.

If you have any upcoming seasonal purchasing requirements, please let us know how we can support {company_name}'s inventory.

Would you be open to a brief 5-minute phone or WhatsApp call this week?

Warm regards,

Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com | 📱 +91 80577 10065
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label"""
    },
    {
        "id": "custom",
        "name": "Custom Email Pitch (Write your own)",
        "category": "Custom",
        "recommended_mode": "text_only",
        "default_attachments": [],
        "subject": "Export Supply & Direct Factory Partnership – OM Enterprise",
        "body": """Dear {buyer_name},

I hope this message finds you well at {company_name}.

We are reaching out from OM Enterprise, direct manufacturer and exporter based in Nepal.

We would be pleased to share our latest product specifications, FOB wholesale price list, and arrange sample delivery to your office.

Best regards,
Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 rameshkrthakur1816@gmail.com
📱 +91 80577 10065
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label"""
    }
]

SPAM_KEYWORDS = [
    "100% free", "guaranteed", "risk-free", "buy now", "urgent",
    "make money", "winner", "cash bonus", "congratulations", "click here",
    "exclusive offer", "act now", "order now", "no cost", "pure profit",
    "double your", "earn $$$", "miracle", "hidden assets"
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
        
    # Penalty for large attachments on cold outreach
    if has_attachments:
        score -= 12
        
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
        tips.append("Both Halloween attachments are included. If testing reveals this lands in Promotions, switch to Text-Only mode for higher Primary Inbox rates.")
    else:
        tips.append("Text-Only Safe Mode active: Zero image attachments ensures maximum 98%+ Primary Inbox placement.")
        
    if found_triggers:
        tips.append(f"Spam filter keywords detected: {', '.join(found_triggers[:3])}. Replace with neutral B2B sourcing phrasing.")
        
    tips.append("Reply-To header is strictly locked to rameshkrthakur1816@gmail.com. When a buyer replies once, future emails land directly in the Primary Inbox.")
    
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
    template_id: Optional[str] = "halloween_special_offer"
    template_name: Optional[str] = "Halloween Special Offer – Handcrafted Decor & Singing Bowls"
    subject: str
    body_text: str
    include_attachments: bool = True
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

    smtp_config = get_effective_smtp_config(db, current_user.id)
    if not smtp_config:
        raise HTTPException(
            status_code=400,
            detail="No email credentials found. Please verify your Brevo API key or Gmail configuration in Settings."
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
    from_email = smtp_config.get("from_email") or "rameshkrthakur1816@gmail.com"
    reply_to = "rameshkrthakur1816@gmail.com"

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
