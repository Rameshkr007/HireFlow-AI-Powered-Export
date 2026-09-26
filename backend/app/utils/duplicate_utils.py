import re
from urllib.parse import urlparse

def normalize_email(email: str) -> str:
    if not email:
        return ""
    return email.lower().strip()

def normalize_company(company: str) -> str:
    if not company:
        return ""
    # lowercase, remove punctuation, strip whitespace
    normalized = company.lower()
    normalized = re.sub(r'[^a-z0-9\s]', '', normalized)
    normalized = ' '.join(normalized.split())
    return normalized

def normalize_url(url: str) -> str:
    if not url:
        return ""
    try:
        parsed = urlparse(url.lower().strip())
        netloc = parsed.netloc or parsed.path
        netloc = netloc.replace('www.', '')
        netloc = netloc.rstrip('/')
        return netloc
    except Exception:
        return url.lower().strip()
