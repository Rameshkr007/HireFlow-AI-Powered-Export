from typing import Dict

DISPOSABLE_DOMAINS = {
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
    'fakeinbox.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
    'spam4.me', 'yopmail.com', 'dispostable.com', 'trashmail.com',
    'mailnull.com', 'mailscrap.com', 'spamgourmet.com'
}

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
    
    # Check for disposable domains
    if domain.lower() in DISPOSABLE_DOMAINS:
        return {"status": "INVALID", "reason": f"Disposable email domain: {domain}"}
    
    # Check domain format
    domain_parts = domain.split('.')
    if len(domain_parts) < 2 or not all(domain_parts):
        return {"status": "INVALID", "reason": "Invalid domain format"}

    # Live MX verification: verify the recipient domain actually exists and accepts mail
    clean_domain = domain.lower().strip()
    try:
        import dns.resolver
        answers = dns.resolver.resolve(clean_domain, 'MX', lifetime=2.5)
        if not answers:
            return {
                "status": "INVALID",
                "reason": f"Domain '{clean_domain}' has no active mail server (no MX records)."
            }
    except dns.resolver.NXDOMAIN:
        return {
            "status": "INVALID",
            "reason": f"Domain '{clean_domain}' does not exist on the internet (NXDOMAIN). Please enter a real recipient email address."
        }
    except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):
        return {
            "status": "INVALID",
            "reason": f"Domain '{clean_domain}' cannot receive emails (no MX records configured)."
        }
    except Exception:
        # Network/DNS timeout - fall through without blocking
        pass

    # Use email_validator for strict check
    try:
        from email_validator import validate_email, EmailNotValidError
        validate_email(email, check_deliverability=False)
        return {"status": "VALID", "reason": "Email syntax is valid"}
    except Exception:
        return {"status": "UNKNOWN", "reason": "Could not fully validate email"}
