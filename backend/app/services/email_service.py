import smtplib
import ssl
import socket
import os
import re
import html
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
    Retrieves the active SMTP configuration for a user.
    Falls back to global settings if user configuration is missing.
    """
    # 1. Try DB configuration
    db_setting = db.query(EmailSetting).filter(EmailSetting.user_id == user_id).first()
    if db_setting and db_setting.smtp_user and db_setting.smtp_password:
        return {
            "provider": db_setting.provider or "gmail",
            "smtp_host": db_setting.smtp_host or "smtp.gmail.com",
            "smtp_port": int(db_setting.smtp_port or 587),
            "smtp_user": db_setting.smtp_user.strip(),
            "smtp_password": clean_password(db_setting.smtp_password),
            "from_name": db_setting.from_name or "",
            "from_email": db_setting.from_email or db_setting.smtp_user.strip(),
            "use_tls": db_setting.use_tls if db_setting.use_tls is not None else True,
            "use_ssl": db_setting.use_ssl if db_setting.use_ssl is not None else False,
            "source": "db"
        }

    # 2. Try Global Environment Settings
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        return {
            "provider": "environment",
            "smtp_host": settings.SMTP_HOST or "smtp.gmail.com",
            "smtp_port": int(settings.SMTP_PORT or 587),
            "smtp_user": settings.SMTP_USER.strip(),
            "smtp_password": clean_password(settings.SMTP_PASSWORD),
            "from_name": settings.SMTP_FROM_NAME or "HireFlow Exporter",
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
    .footer-note {{
      border-top: 1px solid #e5e7eb;
      padding-top: 14px;
      margin-top: 24px;
      font-size: 12px;
      color: #6b7280;
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

def send_smtp_email(
    smtp_config: Dict[str, Any],
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    attachment_path: Optional[str] = None,
    attachment_filename: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Sends an email using standard Python smtplib with TLS/SSL.
    Supports attachments, custom display names, and auto-generated HTML.
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

        # Attachment (e.g. Catalog PDF, Lookbook, Proforma)
        if attachment_path and os.path.exists(attachment_path):
            try:
                with open(attachment_path, "rb") as f:
                    part = MIMEApplication(f.read(), Name=attachment_filename or os.path.basename(attachment_path))
                filename = attachment_filename or os.path.basename(attachment_path)
                part['Content-Disposition'] = f'attachment; filename="{filename}"'
                msg.attach(part)
            except Exception as att_err:
                print(f"[HireFlow Email] Warning: Could not attach file {attachment_path}: {att_err}")

        def _dispatch_attempt(host: str, port: int, is_ssl: bool, is_tls: bool):
            with force_ipv4():
                if is_ssl or port == 465:
                    context = ssl.create_default_context()
                    server = smtplib.SMTP_SSL(host, port, context=context, timeout=25)
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(from_email, [to_email], msg.as_string())
                    server.quit()
                else:
                    server = smtplib.SMTP(host, port, timeout=25)
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
        return False, f"Failed to deliver email: {str(e)}"

def send_real_email_for_campaign(
    campaign: Any,
    buyer: Any,
    user_id: int,
    personalized_body: str,
    db: Session,
    personalized_subject: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """Dispatches a real outreach pitch for a campaign recipient."""
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

    # Check for campaign attachment
    attachment_path = None
    attachment_filename = None
    if campaign.attachment_id:
        attachment = db.query(Attachment).filter(Attachment.id == campaign.attachment_id).first()
        if attachment and os.path.exists(attachment.file_path):
            attachment_path = attachment.file_path
            attachment_filename = attachment.original_name

    subject = personalized_subject or campaign.email_subject or f"Export Partnership Inquiry – {campaign.product or 'Direct Supply'}"
    
    return send_smtp_email(
        smtp_config=smtp_config,
        to_email=buyer.email,
        subject=subject,
        body_text=personalized_body,
        attachment_path=attachment_path,
        attachment_filename=attachment_filename
    )

def test_smtp_dispatch(
    db: Session,
    user_id: int,
    target_email: Optional[str] = None
) -> Dict[str, Any]:
    """Sends a verification email to verify SMTP configuration."""
    smtp_config = get_effective_smtp_config(db, user_id)
    if not smtp_config:
        return {
            "success": False,
            "error": "No SMTP credentials found. Please save your email settings first."
        }

    recipient = target_email.strip() if target_email else smtp_config["from_email"]
    sender_name = smtp_config.get("from_name") or "HireFlow Export System"
    
    subject = "✅ [HireFlow] Real Email Dispatch Connection Verified!"
    test_body = f"""Hello from HireFlow!

Your email dispatch configuration has been successfully tested and verified.

Configuration Details:
• Mail Provider: {smtp_config.get('provider', 'SMTP').title()}
• SMTP Server: {smtp_config.get('smtp_host')}:{smtp_config.get('smtp_port')}
• Authenticated Account: {smtp_config.get('smtp_user')}
• Sender Display Name: {sender_name}
• Mode: REAL Outbound Dispatch

You can now launch outreach campaigns to contact international buyers directly.

Happy exporting!
HireFlow AI Platform"""

    success, error = send_smtp_email(
        smtp_config=smtp_config,
        to_email=recipient,
        subject=subject,
        body_text=test_body
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
