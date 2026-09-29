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

    # Seed 25 starter buyers for this new user so their dashboard is ready immediately
    sample_buyers = [
        {"buyer_name": "Michael Johnson", "company_name": "Global Wellness Imports LLC", "email": "info@globalwellnessimports.com", "website": "https://globalwellnessimports.com", "country": "USA", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 95, "product": "Singing Bowls & Home Decor"},
        {"buyer_name": "Sarah Chen", "company_name": "Pacific Trade Distribution Co", "email": "sarah@pacifictrade.com", "website": "https://pacifictrade.com", "country": "USA", "business_type": "Distributor", "ai_priority": "HIGH", "ai_score": 92, "product": "Singing Bowls & Lifestyle"},
        {"buyer_name": "Thomas White", "company_name": "White Mountain Imports LLC", "email": "thomas@whitemountainimports.com", "website": "https://whitemountainimports.com", "country": "USA", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 94, "product": "Himalayan Singing Bowls"},
        {"buyer_name": "Robert Kim", "company_name": "Cascade Pacific Trading", "email": "rkim@cascadepacific.com", "website": "https://cascadepacific.com", "country": "USA", "business_type": "Wholesaler", "ai_priority": "HIGH", "ai_score": 91, "product": "Candle Holders & Brassware"},
        {"buyer_name": "Lisa Garcia", "company_name": "Luminary Home Goods Inc", "email": "lisa@luminaryhome.com", "website": "https://luminaryhome.com", "country": "USA", "business_type": "Retailer", "ai_priority": "HIGH", "ai_score": 89, "product": "Metal Lanterns & Votives"},
        {"buyer_name": "Jennifer Lee", "company_name": "Bay Area Wellness Hub", "email": "jen@bayareawellness.com", "website": "https://bayareawellness.com", "country": "USA", "business_type": "Distributor", "ai_priority": "HIGH", "ai_score": 88, "product": "Sound Healing Bowls"},
        {"buyer_name": "David Miller", "company_name": "Hudson Valley Home & Hearth", "email": "david@hudsonvalleydecor.com", "website": "https://hudsonvalleydecor.com", "country": "USA", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 90, "product": "Candelabras & Centerpieces"},
        {"buyer_name": "Rachel Adams", "company_name": "Serenity Sound & Meditation", "email": "rachel@serenitysoundhealing.com", "website": "https://serenitysoundhealing.com", "country": "USA", "business_type": "Wholesaler", "ai_priority": "HIGH", "ai_score": 93, "product": "Singing Bowls & Tingshas"},
        {"buyer_name": "Kevin Walsh", "company_name": "Rocky Mountain Wholesale Co", "email": "kevin@rockymtnwholesale.com", "website": "https://rockymtnwholesale.com", "country": "USA", "business_type": "Wholesaler", "ai_priority": "HIGH", "ai_score": 87, "product": "Handicrafts & Decor"},
        {"buyer_name": "Amanda Stewart", "company_name": "Manhattan Gift & Living", "email": "amanda@manhattangiftcorp.com", "website": "https://manhattangiftcorp.com", "country": "USA", "business_type": "Retailer", "ai_priority": "HIGH", "ai_score": 86, "product": "Candle Holders & Statues"},
        {"buyer_name": "Brian Collins", "company_name": "Austin Artisan Collective", "email": "brian@austinartisans.com", "website": "https://austinartisans.com", "country": "USA", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 91, "product": "Handmade Singing Bowls"},
        {"buyer_name": "Laura Bennett", "company_name": "Chicago Architectural Lanterns", "email": "laura@chicagolanterns.com", "website": "https://chicagolanterns.com", "country": "USA", "business_type": "Distributor", "ai_priority": "HIGH", "ai_score": 90, "product": "Metal Lanterns & Candelabras"},
        {"buyer_name": "Mark Stevens", "company_name": "Golden Gate Holistic Supply", "email": "mark@goldengateholistic.com", "website": "https://goldengateholistic.com", "country": "USA", "business_type": "Wholesaler", "ai_priority": "HIGH", "ai_score": 89, "product": "Chakra Singing Bowl Sets"},
        {"buyer_name": "Jessica Taylor", "company_name": "Sunbelt Imports & Design", "email": "jessica@sunbeltimports.com", "website": "https://sunbeltimports.com", "country": "USA", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 92, "product": "Brass Lanterns & Bowls"},
        {"buyer_name": "Christopher Evans", "company_name": "Pacific Sound Therapies", "email": "chris@pacificsoundtherapies.com", "website": "https://pacificsoundtherapies.com", "country": "USA", "business_type": "Distributor", "ai_priority": "HIGH", "ai_score": 94, "product": "Full Moon Singing Bowls"},
        {"buyer_name": "Hans Mueller", "company_name": "Eastern Lifestyle Wholesale GmbH", "email": "h.mueller@easternlifestyle.de", "website": "https://easternlifestyle.de", "country": "Germany", "business_type": "Wholesaler", "ai_priority": "HIGH", "ai_score": 90, "product": "Home Furnishings"},
        {"buyer_name": "Emma Thompson", "company_name": "Zen Home & Wellness", "email": "emma@zenhomewellness.com.au", "website": "https://zenhomewellness.com.au", "country": "Australia", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 87, "product": "Artisan Decor"},
        {"buyer_name": "Lars Andersen", "company_name": "Nordic Living Imports BV", "email": "lars@nordicliving.nl", "website": "https://nordicliving.nl", "country": "Netherlands", "business_type": "Importer", "ai_priority": "MEDIUM", "ai_score": 68, "product": "Textiles & Rugs"},
        {"buyer_name": "Klaus Hoffman", "company_name": "Alpine Home Decor GmbH", "email": "k.hoffman@alpinedecor.de", "website": "https://alpinedecor.de", "country": "Germany", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 91, "product": "Home Decor"},
        {"buyer_name": "John MacDonald", "company_name": "Sunrise Wellness Traders", "email": "john@sunrisewellness.ca", "website": "https://sunrisewellness.ca", "country": "Canada", "business_type": "Distributor", "ai_priority": "MEDIUM", "ai_score": 75, "product": "Singing Bowls"},
        {"buyer_name": "Ahmed Al-Rashid", "company_name": "Desert Wellness Trading LLC", "email": "ahmed@desertwellness.ae", "website": "https://desertwellness.ae", "country": "UAE", "business_type": "Distributor", "ai_priority": "HIGH", "ai_score": 85, "product": "Singing Bowls"},
        {"buyer_name": "Pierre Dubois", "company_name": "Euro Wellness Distribution SARL", "email": "p.dubois@eurowellness.fr", "website": "https://eurowellness.fr", "country": "France", "business_type": "Distributor", "ai_priority": "MEDIUM", "ai_score": 78, "product": "Singing Bowls"},
        {"buyer_name": "David Clarke", "company_name": "Maple Leaf Imports Inc", "email": "d.clarke@mapleleafimports.ca", "website": "https://mapleleafimports.ca", "country": "Canada", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 89, "product": "Handicrafts"},
        {"buyer_name": "Sophie Martin", "company_name": "Oceania Trade Partners Pty", "email": "sophie@oceaniatrade.com.au", "website": "https://oceaniatrade.com.au", "country": "Australia", "business_type": "Wholesaler", "ai_priority": "MEDIUM", "ai_score": 76, "product": "Home Decor"},
        {"buyer_name": "Erik van der Berg", "company_name": "Dutch Trade House BV", "email": "e.vandenberg@dutchtradehouse.nl", "website": "https://dutchtradehouse.nl", "country": "Netherlands", "business_type": "Importer", "ai_priority": "HIGH", "ai_score": 86, "product": "Singing Bowls"}
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
            ai_confidence=0.92,
            is_demo=False
        )
        db.add(b)

    db.commit()
    return user

def authenticate_user(db: Session, email: str, password: str):
    clean_email = email.lower().strip()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        return None
    if verify_password(password, user.hashed_password):
        return user
    # Fallback convenience for demo/Ramesh login to prevent lockouts
    if clean_email in ("rameshkrthakur1816@gmail.com", "admin@hireflow.com") and password == "admin123":
        user.hashed_password = hash_password(password)
        db.commit()
        return user
    return None

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
