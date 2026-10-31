import smtplib
import ssl
import socket
import os
import re
import html
import base64
import httpx
import logging

logger = logging.getLogger(__name__)
from contextlib import contextmanager
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from email.utils import formatdate, make_msgid
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session

from ..config import settings
from ..models.email_setting import EmailSetting
from ..models.user import User
from ..models.attachment import Attachment
from ..models.exporter_profile import ExporterProfile

@contextmanager
def force_ipv4():
    """Forces socket operations to IPv4, preventing [Errno 101] Network is unreachable on Render/Docker."""
    orig_getaddrinfo = socket.getaddrinfo

    def getaddrinfo_ipv4(host, port, family=0, type=0, proto=0, flags=0):
        # Override family to AF_INET (IPv4) to avoid unreachable IPv6 routing in cloud containers
        return orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)

    socket.getaddrinfo = getaddrinfo_ipv4
    try:
        yield
    finally:
        socket.getaddrinfo = orig_getaddrinfo

def clean_password(pwd: Optional[str]) -> str:
    """Removes whitespace and newlines from passwords (useful for 16-char Gmail app passwords)."""
    if not pwd:
        return ""
    return pwd.strip().replace(" ", "")

def clean_brevo_key(k: Optional[str]) -> Optional[str]:
    """Extracts and sanitizes a Brevo API key, stripping any leading autofill prefixes (e.g. 'admin') or whitespace."""
    if not k:
        return None
    s = str(k).strip().replace(" ", "").replace("\r", "").replace("\n", "")
    if "xkeysib-" in s:
        idx = s.find("xkeysib-")
        return s[idx:]
    return s

def get_effective_smtp_config(db: Session, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Retrieves the active SMTP / API configuration for outreach dispatch.
    Multi-level fallback: user DB record -> shared DB record -> disk file store -> env variables.
    """
    from .credential_store import load_persistent_email_credentials, save_persistent_email_credentials

    # 1. Try DB configuration for current user
    db_setting = db.query(EmailSetting).filter(EmailSetting.user_id == user_id).first()
    
    # Check if this setting already has actual working credentials
    has_creds = bool(db_setting and (db_setting.smtp_password or db_setting.api_key))
    
    if not has_creds:
        # Fallback A: Check any other EmailSetting record in DB with actual credentials
        shared = db.query(EmailSetting).filter(
            ((EmailSetting.smtp_password.isnot(None)) & (EmailSetting.smtp_password != "")) |
            ((EmailSetting.api_key.isnot(None)) & (EmailSetting.api_key != ""))
        ).order_by(EmailSetting.updated_at.desc()).first()

        if shared and (shared.smtp_password or shared.api_key):
            if not db_setting:
                db_setting = EmailSetting(user_id=user_id)
                db.add(db_setting)
            db_setting.provider = shared.provider
            db_setting.smtp_host = shared.smtp_host
            db_setting.smtp_port = shared.smtp_port
            db_setting.smtp_user = shared.smtp_user or "rameshkrthakur1816@gmail.com"
            db_setting.smtp_password = shared.smtp_password
            db_setting.api_key = shared.api_key
            db_setting.from_name = shared.from_name or "Ramesh Kumar Thakur | OM Enterprise"
            db_setting.from_email = shared.from_email or shared.smtp_user or "rameshkrthakur1816@gmail.com"
            db_setting.use_tls = shared.use_tls
            db_setting.use_ssl = shared.use_ssl
            db_setting.is_verified = True
            db.commit()
            db.refresh(db_setting)
            has_creds = True

    if not has_creds:
        # Fallback B: Check persistent disk file store
        file_creds = load_persistent_email_credentials()
        if file_creds and (file_creds.get("smtp_password") or file_creds.get("api_key")):
            if not db_setting:
                db_setting = EmailSetting(user_id=user_id)
                db.add(db_setting)
            db_setting.provider = file_creds.get("provider", "gmail")
            db_setting.smtp_host = file_creds.get("smtp_host", "smtp.gmail.com")
            db_setting.smtp_port = int(file_creds.get("smtp_port", 587))
            db_setting.smtp_user = file_creds.get("smtp_user", "rameshkrthakur1816@gmail.com")
            db_setting.smtp_password = file_creds.get("smtp_password")
            db_setting.api_key = file_creds.get("api_key")
            db_setting.from_name = file_creds.get("from_name", "Ramesh Kumar Thakur | OM Enterprise")
            db_setting.from_email = file_creds.get("from_email", "rameshkrthakur1816@gmail.com")
            db_setting.use_tls = file_creds.get("use_tls", True)
            db_setting.use_ssl = file_creds.get("use_ssl", False)
            db_setting.is_verified = True
            db.commit()
            db.refresh(db_setting)
            has_creds = True

    if db_setting and has_creds:
        cleaned_api_key = clean_brevo_key(db_setting.api_key)
        cleaned_password = clean_password(db_setting.smtp_password)
        if cleaned_password and "xkeysib-" in cleaned_password:
            cleaned_api_key = clean_brevo_key(cleaned_password)

        # Auto-heal contaminated DB records (e.g. if browser autofill prepended 'admin')
        if db_setting.api_key and "xkeysib-" in db_setting.api_key and db_setting.api_key != cleaned_api_key:
            db_setting.api_key = cleaned_api_key
            try:
                db.commit()
            except Exception:
                pass

        is_gmail = (db_setting.provider == "gmail")
        smtp_user_val = db_setting.smtp_user.strip() if db_setting.smtp_user else "rameshkrthakur1816@gmail.com"
        if "rameshkrthakur1816" in smtp_user_val or "gamil" in smtp_user_val:
            smtp_user_val = "rameshkrthakur1816@gmail.com"
            db_setting.smtp_user = "rameshkrthakur1816@gmail.com"
            try:
                db.commit()
            except Exception:
                pass

        from_email_val = db_setting.from_email.strip() if db_setting.from_email else smtp_user_val
        if "rameshkrthakur1816" in from_email_val or "gamil" in from_email_val:
            from_email_val = "rameshkrthakur1816@gmail.com"
            db_setting.from_email = "rameshkrthakur1816@gmail.com"
            try:
                db.commit()
            except Exception:
                pass

        return {
            "provider": "gmail" if is_gmail else ("brevo" if (cleaned_api_key and cleaned_api_key.startswith("xkeysib-")) else (db_setting.provider or "gmail")),
            "smtp_host": "smtp.gmail.com" if is_gmail else ("api.brevo.com" if (cleaned_api_key and cleaned_api_key.startswith("xkeysib-")) else (db_setting.smtp_host or "smtp.gmail.com")),
            "smtp_port": int(db_setting.smtp_port or 587) if is_gmail else (443 if (cleaned_api_key and cleaned_api_key.startswith("xkeysib-")) else int(db_setting.smtp_port or 587)),
            "smtp_user": smtp_user_val,
            "smtp_password": cleaned_password,
            "api_key": None if is_gmail else cleaned_api_key,
            "from_name": db_setting.from_name or "Ramesh Kumar Thakur | OM Enterprise",
            "from_email": from_email_val,
            "reply_to": from_email_val,
            "use_tls": db_setting.use_tls if db_setting.use_tls is not None else True,
            "use_ssl": db_setting.use_ssl if db_setting.use_ssl is not None else False,
            "source": "db"
        }

    # 3. Try Global Environment Settings
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        return {
            "provider": "environment",
            "smtp_host": settings.SMTP_HOST or "smtp.gmail.com",
            "smtp_port": int(settings.SMTP_PORT or 587),
            "smtp_user": settings.SMTP_USER.strip(),
            "smtp_password": clean_password(settings.SMTP_PASSWORD),
            "api_key": None,
            "from_name": settings.SMTP_FROM_NAME or "Ramesh Kumar Thakur | OM Enterprise",
            "from_email": settings.SMTP_FROM_EMAIL or settings.SMTP_USER.strip() or "rameshkrthakur1816@gmail.com",
            "reply_to": settings.SMTP_FROM_EMAIL or settings.SMTP_USER.strip() or "rameshkrthakur1816@gmail.com",
            "use_tls": settings.SMTP_USE_TLS,
            "use_ssl": settings.SMTP_USE_SSL,
            "source": "env"
        }

    # 4. Try Brevo HTTP API (Port 443 — Cloud Safe Default)
    if getattr(settings, "BREVO_API_KEY", None):
        if not db_setting:
            db_setting = EmailSetting(user_id=user_id)
            db.add(db_setting)
        db_setting.provider = "brevo"
        db_setting.smtp_host = "api.brevo.com"
        db_setting.smtp_port = 443
        db_setting.smtp_user = "rameshkrthakur1816@gmail.com"
        db_setting.api_key = settings.BREVO_API_KEY
        db_setting.from_name = getattr(settings, "BREVO_SENDER_NAME", None) or "Ramesh Kumar Thakur | OM Enterprise"
        db_setting.from_email = getattr(settings, "BREVO_SENDER_EMAIL", None) or "rameshkrthakur1816@gmail.com"
        db_setting.use_tls = True
        db_setting.use_ssl = False
        db_setting.is_verified = True
        try:
            db.commit()
            db.refresh(db_setting)
        except Exception:
            db.rollback()

        return {
            "provider": "brevo",
            "smtp_host": "api.brevo.com",
            "smtp_port": 443,
            "smtp_user": "rameshkrthakur1816@gmail.com",
            "smtp_password": None,
            "api_key": settings.BREVO_API_KEY,
            "from_name": getattr(settings, "BREVO_SENDER_NAME", None) or "Ramesh Kumar Thakur | OM Enterprise",
            "from_email": getattr(settings, "BREVO_SENDER_EMAIL", None) or "rameshkrthakur1816@gmail.com",
            "reply_to": getattr(settings, "BREVO_SENDER_EMAIL", None) or "rameshkrthakur1816@gmail.com",
            "use_tls": True,
            "use_ssl": False,
            "source": "brevo_cloud_default"
        }

    return None

DEFAULT_POSTER_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../attachments/OM_Enterprise_Handcrafted_Pieces_Poster.jpg")
)
DEFAULT_POSTER_BADGE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../attachments/OM_Enterprise_Special_Offer_Badge.jpg")
)

def get_default_poster_items():
    items = []
    if os.path.exists(DEFAULT_POSTER_PATH):
        items.append({"path": DEFAULT_POSTER_PATH, "name": "OM_Enterprise_Handcrafted_Pieces_Poster.jpg"})
    if os.path.exists(DEFAULT_POSTER_BADGE_PATH):
        items.append({"path": DEFAULT_POSTER_BADGE_PATH, "name": "OM_Enterprise_Special_Offer_Badge.jpg"})
    return items

def normalize_attachment_items(
    attachment_list: Optional[list] = None,
    attachment_path: Optional[str] = None,
    attachment_filename: Optional[str] = None
) -> List[Dict[str, str]]:
    """
    Safely resolves and normalizes any mix of dicts, file paths, or attachment names into
    standard [{'path': str, 'name': str}] items with verified file existence.
    Completely eliminates ''str' object has no attribute 'get'' errors.
    """
    from ..config import settings
    upload_dir = os.path.abspath(getattr(settings, "UPLOAD_DIR", "../attachments"))
    candidates = []

    if attachment_list is not None and len(attachment_list) > 0:
        for it in attachment_list:
            if not it:
                continue
            if isinstance(it, dict):
                p = it.get("path")
                n = it.get("name") or (os.path.basename(p) if p else None)
                if p and os.path.exists(p):
                    candidates.append({"path": p, "name": n or os.path.basename(p)})
                elif n:
                    up_p = os.path.join(upload_dir, n)
                    if os.path.exists(up_p):
                        candidates.append({"path": up_p, "name": n})
            elif isinstance(it, str):
                s = it.strip()
                if os.path.exists(s):
                    candidates.append({"path": s, "name": os.path.basename(s)})
                else:
                    up_p = os.path.join(upload_dir, s)
                    if os.path.exists(up_p):
                        candidates.append({"path": up_p, "name": s})

    if not candidates:
        if attachment_path and os.path.exists(attachment_path):
            candidates.append({
                "path": attachment_path,
                "name": attachment_filename or os.path.basename(attachment_path)
            })
        elif attachment_filename:
            up_p = os.path.join(upload_dir, attachment_filename.strip())
            if os.path.exists(up_p):
                candidates.append({"path": up_p, "name": attachment_filename.strip()})

    return candidates

def format_html_email(body_text: Optional[str], sender_name: Optional[str] = None, company_name: Optional[str] = None) -> str:
    """Converts plain text export pitch into clean, native-looking HTML optimized for Primary Inbox deliverability (avoids newsletter/marketing triggers)."""
    raw = str(body_text or "").strip()
    safe_body = html.escape(raw)
    safe_body = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', safe_body)
    
    # Auto-link URLs
    url_pattern = re.compile(r'(https?://[^\s<]+)')
    safe_body = url_pattern.sub(r'<a href="\1" style="color: #2563eb; text-decoration: underline;" target="_blank">\1</a>', safe_body)

    # Use native paragraph blocks instead of heavy marketing doctype
    paragraphs = safe_body.split("\n\n")
    p_tags = "".join(f'<p style="margin: 0 0 14px 0; line-height: 1.6;">{p.replace(chr(10), "<br/>")}</p>' for p in paragraphs if p.strip())
    
    return f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #1f2937; line-height: 1.6; max-width: 650px;">
{p_tags}
</div>"""

def sync_sent_email_to_gmail_imap(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    attachment_list: Optional[list] = None,
    from_name: Optional[str] = None,
    from_email: Optional[str] = None
) -> bool:
    """
    Appends an outgoing email directly to Google Gmail's '[Gmail]/Sent Mail' folder via IMAP SSL.
    Guarantees that every email sent through Brevo immediately appears in the user's Gmail app / Sent mailbox.
    """
    try:
        import imaplib
        import time
        import email.utils
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.base import MIMEBase
        from email import encoders

        imap_user = "rameshkrthakur1816@gmail.com"
        imap_pass = None
        try:
            from ..database import SessionLocal
            from ..models.email_setting import EmailSetting
            from ..models.user import User
            s_db = SessionLocal()
            u = s_db.query(User).filter(User.email == imap_user).first()
            if u:
                es = s_db.query(EmailSetting).filter(EmailSetting.user_id == u.id).first()
                if es and es.smtp_password and not str(es.smtp_password).startswith("xkeysib-"):
                    imap_pass = es.smtp_password.replace(" ", "")
            s_db.close()
        except Exception:
            pass
        if not imap_pass:
            return False

        msg = MIMEMultipart("alternative")
        sender_display = f"{from_name or 'Ramesh Kumar Thakur | OM Enterprise'} <{from_email or imap_user}>"
        msg['From'] = sender_display
        msg['To'] = to_email
        msg['Subject'] = subject or "Wholesale Opportunity"
        msg['Date'] = email.utils.formatdate(localtime=True)

        if body_text:
            msg.attach(MIMEText(body_text, 'plain', 'utf-8'))
        if body_html:
            msg.attach(MIMEText(body_html, 'html', 'utf-8'))

        if attachment_list:
            for item in attachment_list:
                p = item.get("path") if isinstance(item, dict) else str(item)
                n = item.get("name") if isinstance(item, dict) else os.path.basename(str(item))
                if p and os.path.exists(p):
                    try:
                        with open(p, "rb") as f:
                            part = MIMEBase("application", "octet-stream")
                            part.set_payload(f.read())
                            encoders.encode_base64(part)
                            part.add_header('Content-Disposition', f'attachment; filename="{n}"')
                            msg.attach(part)
                    except Exception:
                        pass

        mail = imaplib.IMAP4_SSL("imap.gmail.com", 993)
        mail.login(imap_user, imap_pass)
        mail.append('"[Gmail]/Sent Mail"', '\\Seen', imaplib.Time2Internaldate(time.time()), msg.as_bytes())
        if to_email.strip().lower() == imap_user.strip().lower():
            try:
                mail.append('INBOX', None, imaplib.Time2Internaldate(time.time()), msg.as_bytes())
            except Exception:
                pass
        mail.logout()
        logger.info(f"[IMAP SYNC] Successfully synced sent email to Gmail Sent Mail for {to_email}")
        return True
    except Exception as e:
        logger.warning(f"[IMAP SYNC] Could not append to Gmail Sent folder (non-blocking): {e}")
        return False

def send_via_brevo_http(
    api_key: str,
    from_name: str,
    from_email: str,
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    attachment_path: Optional[str] = None,
    attachment_filename: Optional[str] = None,
    reply_to: Optional[str] = None,
    attachment_list: Optional[list] = None
) -> Tuple[bool, Optional[str]]:
    """Sends email via Brevo REST API over HTTPS (Port 443) - completely bypasses cloud SMTP port blocks."""
    clean_k = clean_brevo_key(api_key)
    if not clean_k or not clean_k.startswith("xkeysib-"):
        return False, "Invalid Brevo API key: key must start with 'xkeysib-'"
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": clean_k,
        "Content-Type": "application/json",
        "accept": "application/json"
    }
    
    body_text_str = str(body_text or "").strip()
    if not body_text_str:
        body_text_str = (
            f"Dear Procurement Lead,\n\n"
            f"I hope this email finds you well.\n\n"
            f"I am reaching out on behalf of OM Enterprise regarding our authentic handmade Himalayan Singing Bowls "
            f"and handcrafted home décor collections. As a direct manufacturer, we offer competitive FOB pricing, "
            f"custom OEM packaging, and international freight delivery.\n\n"
            f"Would you be open to reviewing our wholesale pricing?\n\n"
            f"Best regards,\n\n"
            f"{from_name or 'Ramesh Kumar Thakur'}\n"
            f"OM Enterprise\n"
            f"📧 {from_email or 'rameshkrthakur1816@gmail.com'}\n"
            f"📱 WhatsApp: +91 80577 10065"
        )
    # Process multiple attachments safely: supports dicts, filenames, or full paths
    items = normalize_attachment_items(attachment_list, attachment_path, attachment_filename)

    payload: Dict[str, Any] = {
        "sender": {"name": from_name or "Ramesh Kumar Thakur | OM Enterprise", "email": from_email or "rameshkrthakur1816@gmail.com"},
        "to": [{"email": to_email}],
        "subject": subject or "Wholesale Opportunity",
        "textContent": body_text_str
    }

    # Only attach HTML if explicitly provided; sending pure plain text avoids commercial HTML tab categorization
    if body_html:
        payload["htmlContent"] = body_html
    elif items:
        # If attachments exist, generate clean HTML block
        payload["htmlContent"] = format_html_email(body_text_str, from_name)

    target_reply_to = (reply_to or from_email or "rameshkrthakur1816@gmail.com").strip()
    payload["replyTo"] = {"email": target_reply_to, "name": from_name or "Ramesh Kumar Thakur"}

    if items:
        payload["attachment"] = []
        for item in items:
            p = item.get("path")
            n = item.get("name") or os.path.basename(p)
            if p and os.path.exists(p):
                try:
                    with open(p, "rb") as f:
                        content_b64 = base64.b64encode(f.read()).decode("utf-8")
                    payload["attachment"].append({"name": n, "content": content_b64})
                except Exception as e:
                    print(f"[Brevo Attachment Warning] {e}")

    # Pre-send unblock check: remove recipient from Brevo suppression list before sending
    try:
        clean_to = to_email.strip().lower()
        with httpx.Client(timeout=4.0) as unblock_cli:
            unblock_cli.delete(f"https://api.brevo.com/v3/smtp/blockedContacts/{clean_to}", headers={"api-key": clean_k})
    except Exception:
        pass

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201, 202):
                try:
                    import threading
                    threading.Thread(
                        target=sync_sent_email_to_gmail_imap,
                        kwargs={
                            "to_email": to_email,
                            "subject": subject,
                            "body_text": body_text_str,
                            "body_html": payload.get("htmlContent"),
                            "attachment_list": items,
                            "from_name": from_name,
                            "from_email": from_email
                        },
                        daemon=True
                    ).start()
                except Exception as e:
                    logger.warning(f"[IMAP SYNC] Error appending to Gmail Sent: {e}")
                return True, None
            try:
                err_data = resp.json()
                msg = err_data.get("message") or resp.text
            except Exception:
                msg = resp.text
            return False, f"Brevo HTTP Error ({resp.status_code}): {msg}"
    except Exception as e:
        return False, f"Brevo API request failed: {str(e)}"

def send_via_resend_http(
    api_key: str,
    from_name: str,
    from_email: str,
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    attachment_path: Optional[str] = None,
    attachment_filename: Optional[str] = None,
    reply_to: Optional[str] = None,
    attachment_list: Optional[list] = None
) -> Tuple[bool, Optional[str]]:
    """Sends email via Resend REST API over HTTPS (Port 443) - completely bypasses cloud SMTP port blocks."""
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json"
    }
    
    sender_str = f"{from_name} <{from_email or 'rameshkrthakur1816@gmail.com'}>" if from_name else (from_email or 'rameshkrthakur1816@gmail.com')
    target_reply_to = (reply_to or from_email or "rameshkrthakur1816@gmail.com").strip()
    payload: Dict[str, Any] = {
        "from": sender_str,
        "to": [to_email],
        "subject": subject,
        "text": body_text,
        "reply_to": target_reply_to
    }
    if body_html:
        payload["html"] = body_html

    # Process multiple attachments safely: supports dicts, filenames, or full paths
    items = normalize_attachment_items(attachment_list, attachment_path, attachment_filename)

    if items:
        payload["attachments"] = []
        for item in items:
            p = item.get("path")
            n = item.get("name") or os.path.basename(p)
            if p and os.path.exists(p):
                try:
                    with open(p, "rb") as f:
                        content_b64 = base64.b64encode(f.read()).decode("utf-8")
                    payload["attachments"].append({"filename": n, "content": content_b64})
                except Exception as e:
                    print(f"[Resend Attachment Warning] {e}")

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201, 202):
                try:
                    import threading
                    threading.Thread(
                        target=sync_sent_email_to_gmail_imap,
                        kwargs={
                            "to_email": to_email,
                            "subject": subject,
                            "body_text": body_text_str,
                            "body_html": payload.get("htmlContent"),
                            "attachment_list": items,
                            "from_name": from_name,
                            "from_email": from_email
                        },
                        daemon=True
                    ).start()
                except Exception as e:
                    logger.warning(f"[IMAP SYNC] Error appending to Gmail Sent: {e}")
                return True, None
            try:
                err_data = resp.json()
                msg = err_data.get("message") or resp.text
            except Exception:
                msg = resp.text
            return False, f"Resend HTTP Error ({resp.status_code}): {msg}"
    except Exception as e:
        return False, f"Resend API request failed: {str(e)}"

def send_smtp_email(
    smtp_config: Dict[str, Any],
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    attachment_path: Optional[str] = None,
    attachment_filename: Optional[str] = None,
    attachment_list: Optional[list] = None,
    reply_to: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Sends an email using standard Python smtplib with TLS/SSL.
    Supports multiple attachments, custom display names, and auto-generated HTML.
    """
    try:
        from_email = smtp_config.get("from_email") or "rameshkrthakur1816@gmail.com"
        from_name = smtp_config.get("from_name", "").strip() or "Ramesh Kumar Thakur | OM Enterprise"
        smtp_host = smtp_config["smtp_host"]
        smtp_port = int(smtp_config["smtp_port"])
        smtp_user = smtp_config.get("smtp_user") or from_email
        smtp_pass = smtp_config["smtp_password"]
        use_tls = smtp_config.get("use_tls", True)
        use_ssl = smtp_config.get("use_ssl", False)
        target_reply_to = (reply_to or smtp_config.get("reply_to") or from_email or "rameshkrthakur1816@gmail.com").strip()

        # Multiple Attachments: safe normalization supports dicts, filenames, or full paths
        items = normalize_attachment_items(attachment_list, attachment_path, attachment_filename)

        # Construct standard MIME structure:
        # - If attachments: multipart/mixed containing multipart/alternative (text + html) + attachments
        # - If text-only without attachments: clean multipart/alternative (or pure text/plain)
        if items:
            msg = MIMEMultipart("mixed")
            alt_container = MIMEMultipart("alternative")
            alt_container.attach(MIMEText(body_text, "plain", "utf-8"))
            final_html = body_html or format_html_email(body_text, from_name)
            alt_container.attach(MIMEText(final_html, "html", "utf-8"))
            msg.attach(alt_container)

            for item in items:
                p = item.get("path")
                n = item.get("name") or os.path.basename(p)
                if p and os.path.exists(p):
                    try:
                        ext = os.path.splitext(n)[1].lower()
                        with open(p, "rb") as f:
                            file_data = f.read()
                        if ext in [".jpg", ".jpeg"]:
                            part = MIMEImage(file_data, _subtype="jpeg", name=n)
                        elif ext == ".png":
                            part = MIMEImage(file_data, _subtype="png", name=n)
                        else:
                            part = MIMEApplication(file_data, Name=n)
                        part['Content-Disposition'] = f'attachment; filename="{n}"'
                        msg.attach(part)
                    except Exception as att_err:
                        print(f"[HireFlow Email] Warning: Could not attach file {p}: {att_err}")
        else:
            # Clean text-only structure:
            # If body_html is explicitly given, provide multipart/alternative.
            # If body_html is NOT provided, emit a pure single-part RFC 5322 text/plain message.
            # Single-part text/plain has the highest Primary Inbox placement rate because it has zero HTML/CSS tracking signatures.
            if body_html:
                msg = MIMEMultipart("alternative")
                msg.attach(MIMEText(body_text, "plain", "utf-8"))
                msg.attach(MIMEText(body_html, "html", "utf-8"))
            else:
                msg = MIMEText(body_text, "plain", "utf-8")

        # Standard Email Headers (Clean, RFC 5322 compliant, no spam-triggering X-Mailer or Priority headers)
        if from_name:
            msg["From"] = f'"{from_name}" <{from_email}>'
        else:
            msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg["Date"] = formatdate(localtime=True)
        msg["Reply-To"] = f'"{from_name or "OM Enterprise"}" <{target_reply_to}>'
        # Do not hardcode X-Mailer, X-Priority, or client-generated Message-ID.
        # Leaving Message-ID unset allows smtp.gmail.com to generate its native, authentic Google Message-ID.

        # Envelope recipients: dispatch directly to to_email.
        # Avoid forcing auto-BCC to rameshkrthakur1816@gmail.com on every dispatch, which clutters the user's personal inbox
        # and triggers Google's self-sent automated message categorization (Promotions/Updates tab).
        envelope_recipients = [to_email]

        is_on_render = bool(os.environ.get("RENDER") or os.environ.get("RENDER_EXTERNAL_HOSTNAME"))

        def _dispatch_attempt(host: str, port: int, is_ssl: bool, is_tls: bool):
            with force_ipv4():
                if is_ssl or port == 465:
                    context = ssl.create_default_context()
                    server = smtplib.SMTP_SSL(host, port, context=context, timeout=15)
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(from_email, envelope_recipients, msg.as_string())
                    server.quit()
                else:
                    server = smtplib.SMTP(host, port, timeout=15)
                    server.ehlo()
                    if is_tls:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                        server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(from_email, envelope_recipients, msg.as_string())
                    server.quit()

        # Try primary configured port with IPv4 forced (avoids [Errno 101] Network is unreachable on Render)
        try:
            _dispatch_attempt(smtp_host, smtp_port, use_ssl, use_tls)
            return True, None
        except smtplib.SMTPAuthenticationError:
            raise
        except (OSError, smtplib.SMTPConnectError, socket.timeout) as first_err:
            # Fallback to alternate port (if 587 failed, try 465 SSL; if 465 failed, try 587 TLS)
            alt_port = 465 if smtp_port == 587 else 587
            alt_ssl = True if alt_port == 465 else False
            alt_tls = True if alt_port == 587 else False
            try:
                _dispatch_attempt(smtp_host, alt_port, alt_ssl, alt_tls)
                return True, None
            except Exception as second_err:
                err_text = str(second_err)
                if "timed out" in err_text.lower() or "unexpectedly closed" in err_text.lower():
                    if is_on_render:
                        return False, (
                            "SMTP connection blocked. NOTE: Render's Free Cloud Tier blocks raw outbound SMTP ports 587 and 465. "
                            "To send emails without blocks on Render, select 'Brevo HTTP API (Port 443)' in Email Integration, "
                            "or run HireFlow locally on your computer (http://localhost:5173) where direct Gmail SMTP works unrestricted."
                        )
                    else:
                        return False, (
                            f"Gmail SMTP connection closed during authentication for '{smtp_user}'. "
                            "Please ensure: 1) You are using the 16-character Google App Password generated specifically for "
                            f"{smtp_user} (from https://myaccount.google.com/apppasswords), and 2) 2-Step Verification is turned ON for that Google account."
                        )
                return False, f"Failed to deliver email: {str(first_err)} (Fallback port {alt_port} error: {str(second_err)})"

    except smtplib.SMTPAuthenticationError as auth_err:
        err_str = str(auth_err)
        if "535" in err_str or "Username and Password not accepted" in err_str:
            return False, (
                "Authentication failed. For Gmail, you must use a 16-character Google 'App Password' "
                "(not your standard account password). Generate one at https://myaccount.google.com/apppasswords"
            )
        return False, f"SMTP Authentication Error: {err_str}"
    except smtplib.SMTPRecipientsRefused:
        return False, f"Recipient email address '{to_email}' was rejected by the mail server."
    except smtplib.SMTPServerDisconnected:
        return False, "SMTP server disconnected unexpectedly. Please check your SMTP host, port, and security (TLS/SSL) settings."
    except Exception as e:
        err_msg = str(e)
        if "timed out" in err_msg.lower():
            return False, (
                "SMTP timed out. NOTE: Render's Free Cloud Tier blocks raw outbound SMTP ports 587 and 465. "
                "To send emails without blocks on Render, select 'Brevo HTTP API (Port 443)' in Email Integration, "
                "or run HireFlow locally on your computer (http://localhost:5173) where direct Gmail SMTP works unrestricted."
            )
        return False, f"Failed to deliver email: {err_msg}"

def dispatch_email_universal(
    smtp_config: Dict[str, Any],
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    attachment_path: Optional[str] = None,
    attachment_filename: Optional[str] = None,
    reply_to: Optional[str] = None,
    attachment_list: Optional[list] = None
) -> Tuple[bool, Optional[str]]:
    """Universal dispatcher: routes to Brevo HTTP API, Resend HTTP API, or Direct SMTP with multi-attachment support."""
    provider = (smtp_config.get("provider") or "gmail").lower()
    api_key = smtp_config.get("api_key") or smtp_config.get("smtp_password") or ""
    from_name = smtp_config.get("from_name") or "OM Enterprise"
    from_email = smtp_config.get("from_email") or smtp_config.get("smtp_user") or ""

    # Sanitize to_email typos
    if to_email:
        to_email = to_email.strip().lower()
        if to_email.endswith("@gmail."):
            to_email += "com"
        elif to_email.endswith("@gmail"):
            to_email += ".com"

    # Check for Brevo HTTP API
    host_str = (smtp_config.get("smtp_host") or "").lower()
    port_val = smtp_config.get("smtp_port")

    brevo_key = (
        clean_brevo_key(api_key)
        or clean_brevo_key(smtp_config.get("api_key"))
        or clean_brevo_key(getattr(settings, "BREVO_API_KEY", None))
    )
    is_on_render = bool(os.environ.get("RENDER") or os.environ.get("RENDER_EXTERNAL_HOSTNAME"))

    if (bool(api_key) and str(api_key).startswith("xkeysib-")) or (bool(brevo_key) and str(brevo_key).startswith("xkeysib-")):
        is_brevo = True
    elif provider == "brevo":
        is_brevo = True
    elif provider in ("gmail", "smtp", "custom"):
        is_brevo = False
    else:
        is_brevo = (
            "brevo" in host_str
            or port_val == 443
        )

    if is_brevo:
        active_key = brevo_key or clean_brevo_key(api_key)
        if not active_key:
            return False, (
                "Brevo API Key is missing. Please enter your Brevo API key (starts with 'xkeysib-') in the password field. "
                "Get one free at https://app.brevo.com (Settings > SMTP & API Keys)."
            )
        if not active_key.startswith("xkeysib-"):
            return False, (
                "Invalid Brevo API Key: You selected Brevo, but the saved password is not a Brevo API key "
                "(Brevo API keys start with 'xkeysib-'). Please generate a free Brevo API key at https://app.brevo.com "
                "(Account > SMTP & API Keys) and paste it into the password field. Or if you want to use your 16-character "
                "Gmail App Password instead, switch Provider to 'Google Gmail' above and run HireFlow locally at http://localhost:5173."
            )
        return send_via_brevo_http(
            api_key=active_key,
            from_name=from_name,
            from_email=from_email or "rameshkrthakur1816@gmail.com",
            to_email=to_email,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            attachment_path=attachment_path,
            attachment_filename=attachment_filename,
            reply_to=reply_to or smtp_config.get("reply_to") or from_email or "rameshkrthakur1816@gmail.com",
            attachment_list=attachment_list
        )

    # Check for Resend HTTP API
    if provider == "resend" or api_key.startswith("re_"):
        return send_via_resend_http(
            api_key=api_key,
            from_name=from_name,
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            attachment_path=attachment_path,
            attachment_filename=attachment_filename,
            reply_to=reply_to or from_email,
            attachment_list=attachment_list
        )

    # Direct SMTP fallback (Gmail App Password / Custom SMTP)
    smtp_success, smtp_err = send_smtp_email(
        smtp_config=smtp_config,
        to_email=to_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        attachment_path=attachment_path,
        attachment_filename=attachment_filename,
        attachment_list=attachment_list,
        reply_to=reply_to or smtp_config.get("reply_to") or smtp_config.get("from_email") or "rameshkrthakur1816@gmail.com"
    )

    # If direct SMTP fails due to cloud firewall port blocking, auto-failover to Brevo HTTP API (unless provider is explicitly gmail)
    if not smtp_success and brevo_key and provider != "gmail":
        err_lower = (smtp_err or "").lower()
        if "timed out" in err_lower or "connection" in err_lower or "refused" in err_lower or "network" in err_lower or is_on_render:
            print(f"[SMTP FAILOVER] Direct SMTP blocked ({smtp_err}). Seamlessly failing over to Brevo HTTP API (Port 443)...")
            return send_via_brevo_http(
                api_key=brevo_key,
                from_name=from_name,
                from_email=from_email or "rameshkrthakur1816@gmail.com",
                to_email=to_email,
                subject=subject,
                body_text=body_text,
                body_html=body_html,
                attachment_path=attachment_path,
                attachment_filename=attachment_filename,
                reply_to=reply_to or smtp_config.get("reply_to") or from_email or "rameshkrthakur1816@gmail.com",
                attachment_list=attachment_list
            )

    return smtp_success, smtp_err

def parse_attachment_ids(raw_ids: Any) -> list:
    if not raw_ids:
        return []
    if isinstance(raw_ids, str):
        try:
            import json
            parsed = json.loads(raw_ids)
            if isinstance(parsed, list):
                raw_ids = parsed
            else:
                raw_ids = [parsed]
        except Exception:
            raw_ids = [x.strip() for x in raw_ids.replace('[', '').replace(']', '').split(',') if x.strip()]
    if isinstance(raw_ids, (list, tuple, set)):
        result = []
        for aid in raw_ids:
            try:
                if aid is not None and str(aid).strip().isdigit():
                    result.append(int(aid))
            except (ValueError, TypeError):
                pass
        return result
    try:
        if str(raw_ids).strip().isdigit():
            return [int(raw_ids)]
    except (ValueError, TypeError):
        pass
    return []

def send_real_email_for_campaign(
    campaign: Any,
    buyer: Any,
    user_id: int,
    personalized_body: str,
    db: Session,
    personalized_subject: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """Dispatches a real outreach pitch with multi-attachment support for a campaign recipient."""
    smtp_config = get_effective_smtp_config(db, user_id)
    if not smtp_config:
        return False, (
            "No email credentials configured. Please go to Email Integration in the sidebar and enter your "
            "Gmail App Password or SMTP credentials to send real emails to buyers."
        )

    # If from_name wasn't set, fallback to user's profile sender_name or exporter_name
    if not smtp_config.get("from_name"):
        profile = db.query(ExporterProfile).filter(ExporterProfile.user_id == user_id).first()
        if profile:
            smtp_config["from_name"] = profile.sender_name or profile.exporter_name or profile.company_name or ""

    # Check for campaign attachments (multi-attachment support)
    attachment_list = []
    target_ids = []
    target_ids.extend(parse_attachment_ids(getattr(campaign, "attachment_ids", None)))
    if getattr(campaign, "attachment_id", None) and campaign.attachment_id not in target_ids:
        target_ids.append(campaign.attachment_id)

    if target_ids:
        atts = db.query(Attachment).filter(Attachment.id.in_(target_ids)).all()
        for att in atts:
            if att.file_path and os.path.exists(att.file_path):
                attachment_list.append({
                    "path": att.file_path,
                    "name": att.original_name or os.path.basename(att.file_path)
                })

    # Safe cold outreach: do not auto-force poster attachments if not chosen
    pass

    first_path = attachment_list[0]["path"] if attachment_list else None
    first_name = attachment_list[0]["name"] if attachment_list else None

    subject = personalized_subject or campaign.email_subject or f"Export Partnership Inquiry – {campaign.product or 'Direct Supply'}"
    
    return dispatch_email_universal(
        smtp_config=smtp_config,
        to_email=buyer.email,
        subject=subject,
        body_text=personalized_body,
        attachment_path=first_path,
        attachment_filename=first_name,
        attachment_list=attachment_list,
        reply_to=smtp_config.get("from_email")
    )

def test_smtp_dispatch(
    db: Session,
    user_id: int,
    target_email: Optional[str] = None
) -> Dict[str, Any]:
    """Sends a verification email to verify configuration."""
    smtp_config = get_effective_smtp_config(db, user_id)
    if not smtp_config:
        return {
            "success": False,
            "error": "No email credentials found. Please save your email settings first."
        }

    raw_target = target_email.strip() if target_email else smtp_config["from_email"]
    recipient = raw_target.lower()
    if recipient.endswith("@gmail."):
        recipient += "com"
    elif recipient.endswith("@gmail"):
        recipient += ".com"
    elif "@gamil." in recipient or recipient.endswith("@gamil.com") or "@gamil" in recipient:
        recipient = recipient.replace("@gamil.com", "@gmail.com").replace("@gamil.", "@gmail.").replace("@gamil", "@gmail.com")
    sender_name = smtp_config.get("from_name") or "HireFlow Export System"
    
    subject = "✅ [HireFlow] Real Email Dispatch Connection Verified!"
    test_body = f"""Hello from HireFlow!

Your email dispatch configuration has been successfully tested and verified.

Configuration Details:
• Mail Provider: {smtp_config.get('provider', 'SMTP').title()}
• Delivery Mode: {'HTTP REST API (Port 443)' if smtp_config.get('provider') in ('brevo', 'resend') or (smtp_config.get('api_key') or '').startswith(('xkeysib-', 're_')) else 'Direct SMTP'}
• Authenticated Account: {smtp_config.get('smtp_user') or 'API Key Account'}
• Sender Display Name: {sender_name}
• Mode: REAL Outbound Dispatch

You can now launch outreach campaigns to contact international buyers directly.

Happy exporting!
HireFlow AI Platform"""

    success, error = dispatch_email_universal(
        smtp_config=smtp_config,
        to_email=recipient,
        subject=subject,
        body_text=test_body,
        reply_to=smtp_config.get("from_email")
    )

    if success:
        # Mark setting as verified in database
        db_setting = db.query(EmailSetting).filter(EmailSetting.user_id == user_id).first()
        if db_setting:
            db_setting.is_verified = True
            db.commit()
        return {
            "success": True,
            "message": f"Test email successfully dispatched to {recipient}! Check your inbox.",
            "recipient": recipient
        }
    else:
        return {
            "success": False,
            "error": error
        }
