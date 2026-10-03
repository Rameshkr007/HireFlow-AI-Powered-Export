from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.profile import ExporterProfileCreate, ExporterProfileUpdate, ExporterProfileResponse
from ..services.auth_service import get_current_user
from ..models.user import User
from ..models.exporter_profile import ExporterProfile

router = APIRouter(prefix="/api/profile", tags=["profile"])

DEFAULT_PROFILE = {
    "exporter_name": "Ramesh Kumar Thakur",
    "sender_name": "Ramesh Kumar Thakur",
    "company_name": "OM Enterprise",
    "company_email": "exportindia2026us@gmail.com",
    "phone": "+91 80577 10065",
    "website": "",
    "country": "India",
    "address": "Moradabad, Uttar Pradesh, India",
    "product_categories": [
        "Handmade Himalayan Singing Bowls",
        "Metal Candle Holders & Lanterns",
        "Candelabras & Centerpieces",
        "Handicrafts & Decor"
    ],
    "company_description": "Direct manufacturer and exporter of authentic handmade Himalayan Singing Bowls, Full Moon Singing Bowls, and handcrafted metal candle holders, candelabras, and lanterns."
}

@router.get("", response_model=ExporterProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(ExporterProfile).filter(ExporterProfile.user_id == current_user.id).first()
    if not profile:
        profile = ExporterProfile(user_id=current_user.id, **DEFAULT_PROFILE)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    else:
        # Guarantee permanent profile data for OM Enterprise
        if (
            profile.company_name != "OM Enterprise" or
            profile.company_email != "exportindia2026us@gmail.com" or
            profile.sender_name != "Ramesh Kumar Thakur" or
            profile.website != "" or
            profile.company_name in ["Himalayan Exports Pvt Ltd", "Raj Kumar Exports", "", None]
        ):
            for k, v in DEFAULT_PROFILE.items():
                setattr(profile, k, v)
            db.commit()
            db.refresh(profile)
    return profile

@router.post("", response_model=ExporterProfileResponse)
def create_profile(data: ExporterProfileCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(ExporterProfile).filter(ExporterProfile.user_id == current_user.id).first()
    if existing:
        for key, value in data.model_dump().items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing
    profile = ExporterProfile(user_id=current_user.id, **data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.put("", response_model=ExporterProfileResponse)
def update_profile(data: ExporterProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(ExporterProfile).filter(ExporterProfile.user_id == current_user.id).first()
    if not profile:
        profile = ExporterProfile(user_id=current_user.id)
        db.add(profile)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile
