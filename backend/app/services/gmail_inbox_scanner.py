# -*- coding: utf-8 -*-
"""
Gmail Live Inbound Reply Scanner
================================
Scans rameshkrthakur1816@gmail.com's inbox via IMAP SSL to detect and import
genuine, real-world buyer replies sent by US importers and procurement leads.
"""

import imaplib
import email
from email.header import decode_header
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from ..models.buyer import Buyer
from ..models.email_send_log import EmailSendLog
from ..models.email_setting import EmailSetting
from ..models.user import User

logger = logging.getLogger(__name__)


def _clean_header(val: Optional[str]) -> str:
    if not val:
        return ""
    decoded_parts = decode_header(val)
    text_parts = []
    for content, enc in decoded_parts:
        if isinstance(content, bytes):
            try:
                text_parts.append(content.decode(enc or "utf-8", errors="replace"))
            except Exception:
                text_parts.append(content.decode("utf-8", errors="replace"))
        else:
            text_parts.append(str(content))
    return "".join(text_parts).strip()


def scan_real_gmail_inbox(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Connects to imap.gmail.com:993 for rameshkrthakur1816@gmail.com.
    Scans recent INBOX messages to detect real inbound buyer replies.
    """
    user = db.query(User).filter(User.id == user_id).first()
    email_user = user.email if user else "rameshkrthakur1816@gmail.com"

    setting = db.query(EmailSetting).filter(EmailSetting.user_id == user_id).first()
    app_password = None
    if setting and setting.smtp_password and not str(setting.smtp_password).startswith("xkeysib-"):
        app_password = setting.smtp_password.replace(" ", "")

    if not app_password:
        return {
            "status": "requires_app_password",
            "real_replies_found": 0,
            "message": (
                "Real Gmail Inbox scanning requires a 16-character Google App Password in Email Integration. "
                "Currently using Brevo API key."
            )
        }

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=15)
        mail.login(email_user, app_password)
        mail.select("INBOX")

        # Search for unread or recent messages from the past 7 days
        status, messages = mail.search(None, 'ALL')
        if status != "OK" or not messages[0]:
            mail.logout()
            return {"status": "ok", "real_replies_found": 0, "message": "No new emails in Gmail inbox."}

        msg_ids = messages[0].split()
        recent_ids = msg_ids[-30:]  # check last 30 inbox emails

        # Pre-fetch known buyer emails
        buyers = db.query(Buyer).filter(Buyer.user_id == user_id).all()
        buyer_emails = {b.email.strip().lower(): b for b in buyers if b.email and "@" in b.email}

        real_replies_imported = []

        for mid in reversed(recent_ids):
            res, data = mail.fetch(mid, "(RFC822)")
            if res != "OK" or not data or not data[0]:
                continue

            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)

            from_hdr = _clean_header(msg.get("From"))
            subj_hdr = _clean_header(msg.get("Subject"))
            date_hdr = msg.get("Date")

            # Extract sender email
            import re
            m = re.search(r'<([^>]+)>', from_hdr)
            sender_email = m.group(1).lower().strip() if m else from_hdr.lower().strip()

            # Ignore self-sent
            if sender_email == email_user.lower():
                continue

            # Check if sender matches a known contacted buyer
            matched_buyer = buyer_emails.get(sender_email)
            if not matched_buyer:
                # Also check domain match
                domain = sender_email.split("@")[-1] if "@" in sender_email else ""
                if domain and domain not in ("gmail.com", "yahoo.com", "hotmail.com", "outlook.com"):
                    for b_em, b_obj in buyer_emails.items():
                        if domain in b_em:
                            matched_buyer = b_obj
                            break

            if matched_buyer:
                # Extract plain text body
                body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                            break
                else:
                    body = msg.get_payload(decode=True).decode("utf-8", errors="replace")

                body_snippet = (body[:250] + "...") if len(body) > 250 else body

                # Update buyer status
                matched_buyer.outreach_status = "REPLIED"
                matched_buyer.ai_priority = "HIGH"
                matched_buyer.ai_score = 99
                matched_buyer.ai_reason = f"[Real Buyer Reply] {body_snippet}"
                matched_buyer.last_contacted = datetime.now(timezone.utc)

                # Record in EmailSendLog as genuine inbound reply
                existing = db.query(EmailSendLog).filter(
                    EmailSendLog.recipient_email == sender_email,
                    EmailSendLog.status == "REPLIED",
                    EmailSendLog.user_id == user_id
                ).first()

                if not existing:
                    new_log = EmailSendLog(
                        operation_id=f"op_real_reply_{matched_buyer.id}_{mid.decode()}",
                        user_id=user_id,
                        buyer_id=matched_buyer.id,
                        recipient_email=sender_email,
                        recipient_name=matched_buyer.buyer_name or from_hdr,
                        company_name=matched_buyer.company_name,
                        product=matched_buyer.product or "Export Inquiry",
                        subject=subj_hdr,
                        body_text=body,
                        status="REPLIED",
                        is_verified=True
                    )
                    db.add(new_log)

                real_replies_imported.append({
                    "buyer_id": matched_buyer.id,
                    "company_name": matched_buyer.company_name,
                    "sender_email": sender_email,
                    "subject": subj_hdr,
                    "body_snippet": body_snippet
                })

        db.commit()
        mail.logout()

        return {
            "status": "success",
            "real_replies_found": len(real_replies_imported),
            "replies": real_replies_imported,
            "message": f"Scanned Gmail inbox: {len(real_replies_imported)} verified buyer replies found."
        }

    except Exception as e:
        logger.error(f"[GMAIL SCANNER ERROR] {e}")
        return {
            "status": "error",
            "real_replies_found": 0,
            "message": f"Could not scan Gmail inbox: {str(e)}"
        }
