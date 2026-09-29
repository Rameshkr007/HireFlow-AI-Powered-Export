from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..models.user import User
from ..utils.security import hash_password, verify_password, create_access_token, decode_token
from ..database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

from typing import Optional
from ..models.exporter_profile import ExporterProfile
from ..models.buyer import Buyer
from ..utils.duplicate_utils import normalize_email

def register_user(
    db: Session,
    email: str,
    password: str,
    exporter_name: Optional[str] = None,
    company_name: Optional[str] = None
) -> User:
    existing = db.query(User).filter(User.email == email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="This email address is already registered. Please sign in.")
    
    clean_email = email.lower().strip()
    user = User(
        email=clean_email,
        hashed_password=hash_password(password),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize real exporter profile
    display_name = (exporter_name or clean_email.split('@')[0].replace('.', ' ').title()).strip()
    company = (company_name or f"{display_name} Global Trade").strip()

    profile = ExporterProfile(
        user_id=user.id,
        exporter_name=display_name,
        company_name=company,
        company_email=clean_email,
        sender_name=display_name,
        country="India",
        product_categories=["Handicrafts", "Textiles", "Home Decor"],
        company_description=f"Export enterprise specializing in high-quality products."
    )
    db.add(profile)

    # Seed starter buyers for this new user so their dashboard is ready immediately
    sample_buyers = [
        {"buyer_name": "Michael Johnson", "company_name": "Global Wellness Imports LLC", "email": "info@globalwellnessimports.com", "website": "https://globalwellnessimports.com", "country": "USA", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 92, "product": "Home Decor & Crafts"},
        {"buyer_name": "Sarah Chen", "company_name": "Pacific Trade Distribution Co", "email": "sarah@pacifictrade.com", "website": "https://pacifictrade.com", "country": "USA", "business_type": "Distributor", "ai_priority": "HIGH", "ai_score": 88, "product": "Singing Bowls & Lifestyle"},
        {"buyer_name": "Hans Mueller", "company_name": "Eastern Lifestyle Wholesale GmbH", "email": "h.mueller@easternlifestyle.de", "website": "https://easternlifestyle.de", "country": "Germany", "business_type": "Wholesaler", "ai_priority": "HIGH", "ai_score": 90, "product": "Home Furnishings"},
        {"buyer_name": "Emma Thompson", "company_name": "Zen Home & Wellness", "email": "emma@zenhomewellness.com.au", "website": "https://zenhomewellness.com.au", "country": "Australia", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 87, "product": "Artisan Decor"},
        {"buyer_name": "Lars Andersen", "company_name": "Nordic Living Imports BV", "email": "lars@nordicliving.nl", "website": "https://nordicliving.nl", "country": "Netherlands", "business_type": "Importer", "ai_priority": "MEDIUM", "ai_score": 68, "product": "Textiles & Rugs"},
    ]
    for bd in sample_buyers:
        b = Buyer(
            user_id=user.id,
            buyer_name=bd["buyer_name"],
            company_name=bd["company_name"],
            email=bd["email"],
            normalized_email=normalize_email(bd["email"]),
            website=bd["website"],
            country=bd["country"],
            source_platform="Import Trade Directory",
            business_type=bd["business_type"],
            product=bd["product"],
            email_status="VALID",
            outreach_status="PENDING",
            ai_priority=bd["ai_priority"],
            ai_score=bd["ai_score"],
            ai_confidence=0.85,
            is_demo=False
        )
        db.add(b)

    db.commit()
    return user

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user
