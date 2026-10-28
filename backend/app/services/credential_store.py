import json
import os
from typing import Optional, Dict, Any

CREDENTIALS_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "email_credentials_store.json")
)

def save_persistent_email_credentials(data: Dict[str, Any]) -> bool:
    """Saves email dispatch credentials permanently to disk so they survive DB resets & restarts."""
    try:
        # Don't save empty records
        if not data.get("smtp_password") and not data.get("api_key") and not data.get("smtp_user"):
            return False

        payload = {
            "provider": data.get("provider") or "gmail",
            "smtp_host": data.get("smtp_host") or "smtp.gmail.com",
            "smtp_port": int(data.get("smtp_port") or 587),
            "smtp_user": (data.get("smtp_user") or "rameshkrthakur1816@gmail.com").strip(),
            "smtp_password": (data.get("smtp_password") or "").strip(),
            "api_key": (data.get("api_key") or "").strip() or None,
            "from_name": (data.get("from_name") or "Ramesh Kumar Thakur | OM Enterprise").strip(),
            "from_email": (data.get("from_email") or data.get("smtp_user") or "rameshkrthakur1816@gmail.com").strip(),
            "use_tls": data.get("use_tls", True),
            "use_ssl": data.get("use_ssl", False),
            "is_verified": True
        }

        with open(CREDENTIALS_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        print(f"[CREDENTIAL_STORE] Saved persistent email credentials to {CREDENTIALS_FILE}")
        return True
    except Exception as e:
        print(f"[CREDENTIAL_STORE] Error saving credentials to disk: {e}")
        return False

def load_persistent_email_credentials() -> Optional[Dict[str, Any]]:
    """Loads email dispatch credentials from disk fallback store."""
    if not os.path.exists(CREDENTIALS_FILE):
        return None
    try:
        with open(CREDENTIALS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if data and (data.get("smtp_password") or data.get("api_key") or data.get("smtp_user")):
            return data
    except Exception as e:
        print(f"[CREDENTIAL_STORE] Error loading credentials from disk: {e}")
    return None
