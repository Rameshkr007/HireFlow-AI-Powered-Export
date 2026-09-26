from sqlalchemy.orm import Session
from typing import Optional
from ..config import settings
from ..models.gmail_connection import GmailConnection


def get_gmail_auth_url(user_id: int) -> Optional[str]:
    """Generate Gmail OAuth authorization URL."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return None

    try:
        from google_auth_oauthlib.flow import Flow
        SCOPES = ['https://www.googleapis.com/auth/gmail.send']

        flow = Flow.from_client_config(
            client_config={
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                }
            },
            scopes=SCOPES
        )
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=str(user_id),
            prompt='consent'
        )
        return authorization_url
    except Exception:
        return None


def get_gmail_status(db: Session, user_id: int) -> dict:
    """Get Gmail connection status for user."""
    conn = db.query(GmailConnection).filter(GmailConnection.user_id == user_id).first()
    if not conn or not conn.is_connected:
        return {
            "connected": False,
            "gmail_email": None,
            "mode": settings.GMAIL_MODE
        }
    return {
        "connected": True,
        "gmail_email": conn.gmail_email,
        "mode": settings.GMAIL_MODE
    }


def handle_oauth_callback(db: Session, code: str, state: str) -> dict:
    """Handle OAuth callback and store tokens."""
    try:
        user_id = int(state)
    except Exception:
        return {"success": False, "error": "Invalid state parameter"}

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return {"success": False, "error": "Gmail OAuth not configured"}

    try:
        from google_auth_oauthlib.flow import Flow
        from googleapiclient.discovery import build

        SCOPES = ['https://www.googleapis.com/auth/gmail.send']
        flow = Flow.from_client_config(
            client_config={
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                }
            },
            scopes=SCOPES
        )
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Get Gmail email
        service = build('gmail', 'v1', credentials=credentials)
        profile = service.users().getProfile(userId='me').execute()
        gmail_email = profile.get('emailAddress')

        # Store connection
        conn = db.query(GmailConnection).filter(GmailConnection.user_id == user_id).first()
        if not conn:
            conn = GmailConnection(user_id=user_id)
            db.add(conn)

        from datetime import datetime
        conn.gmail_email = gmail_email
        conn.access_token = credentials.token
        conn.refresh_token = credentials.refresh_token
        conn.token_expiry = credentials.expiry
        conn.is_connected = True
        db.commit()

        return {"success": True, "gmail_email": gmail_email}
    except Exception as e:
        return {"success": False, "error": str(e)}


def disconnect_gmail(db: Session, user_id: int):
    """Disconnect Gmail for user."""
    conn = db.query(GmailConnection).filter(GmailConnection.user_id == user_id).first()
    if conn:
        conn.is_connected = False
        conn.access_token = None
        conn.refresh_token = None
        conn.token_expiry = None
        db.commit()
