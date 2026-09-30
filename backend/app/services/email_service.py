import smtplib
import ssl
import socket
import os
import re
import html
import base64
import httpx
from contextlib import contextmanager
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.utils import formatdate, make_msgid
from typing import Optional, Tuple, Dict, Any
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
        return {
            "provider": db_setting.provider or "gmail",
            "smtp_host": db_setting.smtp_host or "smtp.gmail.com",
            "smtp_port": int(db_setting.smtp_port or 587),
            "smtp_user": db_setting.smtp_user.strip() if db_setting.smtp_user else "rameshkrthakur1816@gmail.com",
            "smtp_password": clean_password(db_setting.smtp_password),
            "api_key": db_setting.api_key.strip() if db_setting.api_key else None,
            "from_name": db_setting.from_name or "Ramesh Kumar Thakur | OM Enterprise",
            "from_email": db_setting.from_email or (db_setting.smtp_user.strip() if db_setting.smtp_user else "rameshkrthakur1816@gmail.com"),
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
            "from_email": settings.SMTP_FROM_EMAIL or settings.SMTP_USER.strip(),
            "use_tls": settings.SMTP_USE_TLS,
            "use_ssl": settings.SMTP_USE_SSL,
            "source": "env"
        }

    return None

def format_html_email(body_text: str, sender_name: Optional[str] = None, company_name: Optional[str] = None) -> str:
    """Converts plain text export pitch with linebreaks into clean, responsive HTML."""
    safe_body = html.escape(body_text).replace("\n", "<br/>")
    
    # Auto-link URLs
    url_pattern = re.compile(r'(https?://[^\s<]+)')
    safe_body = url_pattern.sub(r'<a href="\1" style="color: #2563eb; text-decoration: underline;" target="_blank">\1</a>', safe_body)

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #ffffff;
      margin: 0;
      padding: 16px;
    }}
    .email-container {{
      max-width: 600px;
      margin: 0 auto;
      font-size: 15px;
    }}
    .body-content {{
      margin-bottom: 24px;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="body-content">
      {safe_body}
    </div>
  </div>
</body>
</html>"""
    return html_content

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
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": api_key.strip(),
        "Content-Type": "application/json",
        "accept": "application/json"
    }
    
    html_body = body_html or format_html_email(body_text, from_name)
    payload: Dict[str, Any] = {
        "sender": {"name": from_name or "OM Enterprise", "email": from_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": body_text
    }
    if reply_to:
        payload["replyTo"] = {"email": reply_to}

    # Auto-BCC sender so sent copy is immediately visible in their Gmail inbox
    bcc_addr = (reply_to or from_email or "").strip()
    if bcc_addr and "@" in bcc_addr and bcc_addr.lower() != to_email.lower():
        payload["bcc"] = [{"email": bcc_addr}]

    # Process multiple attachments
    items = list(attachment_list or [])
    if not items and attachment_path and os.path.exists(attachment_path):
        items = [{"path": attachment_path, "name": attachment_filename or os.path.basename(attachment_path)}]

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

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201, 202):
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
    
    sender_str = f"{from_name} <{from_email}>" if from_name else from_email
    payload: Dict[str, Any] = {
        "from": sender_str,
        "to": [to_email],
        "subject": subject,
        "html": body_html or format_html_email(body_text, from_name),
        "text": body_text
    }
    if reply_to:
        payload["reply_to"] = reply_to

    # Auto-BCC sender so sent copy is immediately visible in their Gmail inbox
    bcc_addr = (reply_to or from_email or "").strip()
    if bcc_addr and "@" in bcc_addr and bcc_addr.lower() != to_email.lower():
        payload["bcc"] = [bcc_addr]

    # Process multiple attachments
    items = list(attachment_list or [])
    if not items and attachment_path and os.path.exists(attachment_path):
        items = [{"path": attachment_path, "name": attachment_filename or os.path.basename(attachment_path)}]

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
    attachment_list: Optional[list] = None
) -> Tuple[bool, Optional[str]]:
    """
    Sends an email using standard Python smtplib with TLS/SSL.
    Supports multiple attachments, custom display names, and auto-generated HTML.
    """
    try:
        from_email = smtp_config["from_email"]
        from_name = smtp_config.get("from_name", "").strip()
        smtp_host = smtp_config["smtp_host"]
        smtp_port = int(smtp_config["smtp_port"])
        smtp_user = smtp_config["smtp_user"]
        smtp_pass = smtp_config["smtp_password"]
        use_tls = smtp_config.get("use_tls", True)
        use_ssl = smtp_config.get("use_ssl", False)

        # Build email message
        msg = MIMEMultipart("mixed")
        if from_name:
            msg["From"] = f'"{from_name}" <{from_email}>'
        else:
            msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain=from_email.split("@")[-1] if "@" in from_email else "hireflow.com")
        msg["Reply-To"] = from_email

        # Body parts
        alt_container = MIMEMultipart("alternative")
        alt_container.attach(MIMEText(body_text, "plain", "utf-8"))
        
        final_html = body_html or format_html_email(body_text, from_name)
        alt_container.attach(MIMEText(final_html, "html", "utf-8"))
        msg.attach(alt_container)

        # Multiple Attachments (e.g. Catalog PDF, Lookbook, Proforma)
        items = list(attachment_list or [])
        if not items and attachment_path and os.path.exists(attachment_path):
            items = [{"path": attachment_path, "name": attachment_filename or os.path.basename(attachment_path)}]

        for item in items:
            p = item.get("path")
            n = item.get("name") or os.path.basename(p)
            if p and os.path.exists(p):
                try:
                    with open(p, "rb") as f:
                        part = MIMEApplication(f.read(), Name=n)
                    part['Content-Disposition'] = f'attachment; filename="{n}"'
                    msg.attach(part)
                except Exception as att_err:
                    print(f"[HireFlow Email] Warning: Could not attach file {p}: {att_err}")

        def _dispatch_attempt(host: str, port: int, is_ssl: bool, is_tls: bool):
            with force_ipv4():
                if is_ssl or port == 465:
                    context = ssl.create_default_context()
                    server = smtplib.SMTP_SSL(host, port, context=context, timeout=15)
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(from_email, [to_email], msg.as_string())
                    server.quit()
                else:
                    server = smtplib.SMTP(host, port, timeout=15)
                    server.ehlo()
                    if is_tls:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                        server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(from_email, [to_email], msg.as_string())
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
                if "timed out" in err_text.lower():
                    return False, (
                        "SMTP timed out. NOTE: Render's Free Cloud Tier blocks raw outbound SMTP ports 587 and 465. "
                        "To send emails without blocks on Render, select 'Brevo HTTP API (Port 443)' in Email Integration, "
                        "or run HireFlow locally on your computer (http://localhost:5173) where direct Gmail SMTP works unrestricted."
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

    # Check for Brevo HTTP API
    if provider == "brevo" or api_key.startswith("xkeysib-"):
        return send_via_brevo_http(
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
    return send_smtp_email(
        smtp_config=smtp_config,
        to_email=to_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        attachment_path=attachment_path,
        attachment_filename=attachment_filename,
        attachment_list=attachment_list
    )

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
    if getattr(campaign, "attachment_ids", None):
        target_ids.extend([int(aid) for aid in campaign.attachment_ids if aid])
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

    recipient = target_email.strip() if target_email else smtp_config["from_email"]
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
