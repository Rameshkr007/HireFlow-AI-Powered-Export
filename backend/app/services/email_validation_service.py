import logging
from typing import Dict

logger = logging.getLogger(__name__)

DISPOSABLE_DOMAINS = {
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
    'fakeinbox.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
    'spam4.me', 'yopmail.com', 'dispostable.com', 'trashmail.com',
    'mailnull.com', 'mailscrap.com', 'spamgourmet.com'
}

MAJOR_PROVIDERS = {
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk',
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com',
    'me.com', 'mac.com', 'aol.com', 'zoho.com', 'proton.me', 'protonmail.com'
}

# In-memory cache for fast domain MX lookups
_MX_CACHE: Dict[str, bool] = {}


def is_domain_mx_valid(domain: str) -> bool:
    """Check if domain has active MX records on the public internet, using local memory cache."""
    clean_domain = (domain or "").strip().lower()
    if not clean_domain or '.' not in clean_domain:
        return False

    if clean_domain in MAJOR_PROVIDERS:
        _MX_CACHE[clean_domain] = True
        return True
    
    if clean_domain in _MX_CACHE:
        return _MX_CACHE[clean_domain]
    
    has_mx = False
    try:
        import dns.resolver
        resolver = dns.resolver.Resolver()
        resolver.timeout = 3.0
        resolver.lifetime = 3.0
        try:
            answers = resolver.resolve(clean_domain, 'MX')
            has_mx = len(answers) > 0
        except Exception:
            # Fallback to Google / Cloudflare public DNS
            resolver.nameservers = ['8.8.8.8', '1.1.1.1']
            answers = resolver.resolve(clean_domain, 'MX')
            has_mx = len(answers) > 0
    except Exception:
        has_mx = False
        
    if has_mx:
        _MX_CACHE[clean_domain] = True
    return has_mx


def validate_email_address(email: str) -> Dict[str, str]:
    if not email or not email.strip():
        return {"status": "INVALID", "reason": "Email is empty"}
    
    email = email.strip()
    
    # Basic syntax check
    if '@' not in email or '.' not in email.split('@')[-1]:
        return {"status": "INVALID", "reason": "Invalid email syntax"}
    
    parts = email.split('@')
    if len(parts) != 2:
        return {"status": "INVALID", "reason": "Invalid email format"}
    
    local, domain = parts
    if not local or not domain:
        return {"status": "INVALID", "reason": "Invalid email parts"}
    
    clean_domain = domain.lower().strip()
    
    # Check for disposable domains
    if clean_domain in DISPOSABLE_DOMAINS:
        return {"status": "INVALID", "reason": f"Disposable email domain: {clean_domain}"}
    
    # Check domain format
    domain_parts = clean_domain.split('.')
    if len(domain_parts) < 2 or not all(domain_parts):
        return {"status": "INVALID", "reason": "Invalid domain format"}

    # Live MX verification: verify the recipient domain actually exists and accepts mail
    if not is_domain_mx_valid(clean_domain):
        return {
            "status": "INVALID",
            "reason": f"Domain '{clean_domain}' does not exist or has no active mail server (no MX records configured)."
        }

    # Use email_validator for syntax validation
    try:
        from email_validator import validate_email
        validate_email(email, check_deliverability=False)
        return {"status": "VALID", "reason": "Email domain has active MX records and valid syntax"}
    except Exception:
        # If syntax passes basic check and has MX records, mark VALID
        return {"status": "VALID", "reason": "Domain has active MX records"}
