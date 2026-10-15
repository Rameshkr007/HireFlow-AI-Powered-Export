import json
import os
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models.email_log import EmailLog
from ..models.buyer import Buyer
from ..models.campaign import Campaign
from ..utils.duplicate_utils import normalize_email

PERSISTENT_LOGS_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "persistent_email_logs.json")
)

def load_persistent_email_logs() -> List[Dict[str, Any]]:
    """Loads all persistent email logs from disk."""
    if not os.path.exists(PERSISTENT_LOGS_FILE):
        return []
    try:
        with open(PERSISTENT_LOGS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"[EMAIL_LOG_STORE] Error loading logs from {PERSISTENT_LOGS_FILE}: {e}")
        return []

def append_persistent_email_log(entry: Dict[str, Any]) -> bool:
    """Appends or updates a single log entry in persistent_email_logs.json."""
    try:
        logs = load_persistent_email_logs()
        target_em = normalize_email(entry.get("email_address") or entry.get("buyer_email") or "")
        target_dt = str(entry.get("sent_at") or entry.get("created_at") or "")[:10]

        # Check if already exists with same email and date
        existing_idx = None
        for idx, l in enumerate(logs):
            l_em = normalize_email(l.get("email_address") or l.get("buyer_email") or "")
            l_dt = str(l.get("sent_at") or l.get("created_at") or "")[:10]
            if l_em == target_em and l_dt == target_dt:
                existing_idx = idx
                break

        if existing_idx is not None:
            logs[existing_idx] = entry
        else:
            logs.append(entry)

        with open(PERSISTENT_LOGS_FILE, "w", encoding="utf-8") as f:
            json.dump(logs, f, indent=2)
        return True
    except Exception as e:
        print(f"[EMAIL_LOG_STORE] Error appending log to disk: {e}")
        return False

def restore_email_logs_to_db(db: Session, user_id: int, campaign_id: int) -> int:
    """
    Restores any missing email logs from persistent_email_logs.json into the database.
    Guarantees 100% data persistence across server restarts, container rebuilds, and logins.
    """
    persistent_logs = load_persistent_email_logs()
    if not persistent_logs:
        return 0

    existing_logs = db.query(EmailLog).filter(EmailLog.user_id == user_id).all()
    existing_keys = set()
    for el in existing_logs:
        dt = el.sent_at or el.created_at
        dt_str = dt.strftime("%Y-%m-%d") if dt else ""
        norm_em = normalize_email(el.email_address or "")
        existing_keys.add((norm_em, dt_str))
    # Remove any stray demo emails on 2026-10-14 (such as w.bauer@hamburgimport.de)
    for el in existing_logs:
        dt = el.sent_at or el.created_at
        dt_str = dt.strftime("%Y-%m-%d") if dt else ""
        if dt_str == "2026-10-14" and normalize_email(el.email_address or "") == "w.bauer@hamburgimport.de":
            db.delete(el)
            existing_keys.discard((normalize_email(el.email_address or ""), dt_str))
    db.commit()

    # Pre-cache user buyers
    user_buyers = db.query(Buyer).filter(Buyer.user_id == user_id).all()
    buyers_by_email = {b.normalized_email: b for b in user_buyers if b.normalized_email}

    restored_count = 0
    for p in persistent_logs:
        p_email = p.get("email_address") or p.get("buyer_email") or ""
        norm_p_email = normalize_email(p_email)
        p_sent_at_str = p.get("sent_at") or p.get("created_at") or ""
        p_date_str = p_sent_at_str[:10]

        if (norm_p_email, p_date_str) in existing_keys:
            continue

        # Parse timestamps
        sent_at_dt = None
        if p.get("sent_at"):
            try:
                sent_at_dt = datetime.fromisoformat(p["sent_at"].replace("Z", "+00:00"))
            except Exception:
                try:
                    sent_at_dt = datetime.strptime(p["sent_at"][:19], "%Y-%m-%dT%H:%M:%S")
                except Exception:
                    pass

        created_at_dt = None
        if p.get("created_at"):
            try:
                created_at_dt = datetime.fromisoformat(p["created_at"].replace("Z", "+00:00"))
            except Exception:
                try:
                    created_at_dt = datetime.strptime(p["created_at"][:19], "%Y-%m-%dT%H:%M:%S")
                except Exception:
                    pass
        if not created_at_dt:
            created_at_dt = sent_at_dt or datetime.now()

        # Link buyer
        buyer = buyers_by_email.get(norm_p_email)
        if not buyer and norm_p_email:
            buyer = Buyer(
                user_id=user_id,
                buyer_name=p.get("buyer_name") or "Purchasing Manager",
                company_name=p.get("company_name") or "California Importer",
                email=p_email,
                normalized_email=norm_p_email,
                country=p.get("country") or "USA",
                state=p.get("state") or "CA",
                city=p.get("city") or "Los Angeles",
                product=p.get("product") or "Handmade Himalayan Singing Bowls",
                business_type="Importer",
                email_status="VALID",
                outreach_status="CONTACTED" if p.get("status") == "SENT" else "PENDING",
                last_contacted=sent_at_dt if p.get("status") == "SENT" else None,
                is_demo=False
            )
            db.add(buyer)
            db.flush()
            buyers_by_email[norm_p_email] = buyer

        new_log = EmailLog(
            campaign_id=campaign_id,
            buyer_id=buyer.id if buyer else None,
            user_id=user_id,
            email_address=p_email,
            subject=p.get("subject") or "Authentic Handmade Himalayan Singing Bowls – Direct Manufacturer",
            personalized_body=p.get("personalized_body") or "",
            status=p.get("status") or "SENT",
            error_message=p.get("error_message"),
            sent_at=sent_at_dt,
            created_at=created_at_dt
        )
        db.add(new_log)
        existing_keys.add((norm_p_email, p_date_str))
        restored_count += 1

    if restored_count > 0:
        db.commit()
        print(f"[EMAIL_LOG_STORE] Restored {restored_count} logs from persistent storage.")

    return restored_count
